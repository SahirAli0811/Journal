import { createClient } from "@/lib/supabase/server";

export default async function TestSupabase() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("test_connection")
        .select("*");

    if (error) {
        return (
            <div style={{ padding: "40px" }}>
                <h1>Supabase Error</h1>
                <pre>{error.message}</pre>
            </div>
        );
    }

    return (
        <div style={{ padding: "40px" }}>
            <h1>Supabase Connected ✅</h1>

            <pre>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}