import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .eq("key", "exchange_rate")
      .single();

    if (error || !data) {
      return NextResponse.json({ rate: 2850, default: true });
    }

    const rateVal = typeof data.value === "object" && data.value !== null ? (data.value as any).rate : 2850;
    return NextResponse.json({
      rate: Number(rateVal) || 2850,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
    });
  } catch (err: any) {
    return NextResponse.json({ rate: 2850, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Action réservée à l'administrateur système" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const newRate = parseFloat(body.rate);

    if (isNaN(newRate) || newRate <= 0) {
      return NextResponse.json(
        { error: "Taux de change invalide. Doit être un nombre positif." },
        { status: 400 }
      );
    }

    // 3. Fetch existing rate
    const { data: existing } = await supabase
      .from("system_settings")
      .select("*")
      .eq("key", "exchange_rate")
      .single();

    const previousRate = existing?.value?.rate || 2850;

    // 4. Update system_settings
    const { error: updateError } = await supabase
      .from("system_settings")
      .upsert({
        key: "exchange_rate",
        value: {
          rate: newRate,
          currency_pair: "USD/CDF",
          label: "Taux Fixe de Référence",
          last_updated_by: profile.full_name,
        },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });

    if (updateError) {
      return NextResponse.json(
        { error: "Échec de mise à jour du taux : " + updateError.message },
        { status: 500 }
      );
    }

    // 5. Audit Log insertion
    await supabase.from("audit_logs").insert({
      table_name: "system_settings",
      record_id: "exchange_rate",
      action: "UPDATE_EXCHANGE_RATE",
      new_data: {
        new_rate: newRate,
        previous_rate: previousRate,
        currency_pair: "USD/CDF",
        operator: profile.full_name,
      },
      performed_by: user.id,
      performed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      rate: newRate,
      previous_rate: previousRate,
      message: `Taux mis à jour : 1 USD = ${newRate.toLocaleString("fr-FR")} CDF`,
    });
  } catch (err: any) {
    console.error("Erreur serveur API exchange-rate:", err);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Une erreur interne est survenue lors du traitement."
            : "Erreur serveur : " + err.message,
      },
      { status: 500 }
    );
  }
}
