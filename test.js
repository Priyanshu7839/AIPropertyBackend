import { supabase } from "./Supabase.js"

async function testSupabase(){
    try {
        const {data,error} = await supabase
        .from("properties")
        .select('*')
        .limit(1);
        console.log('Connected To Supabase')
    } catch (error) {
        console.error('Supabase Connection Failed')
        console.error(error)
    }
}

export default {testSupabase}