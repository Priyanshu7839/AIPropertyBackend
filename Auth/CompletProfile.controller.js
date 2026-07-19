import { supabase } from "../Supabase.js";


export const completeProfile = async (req, res) => {

  console.log('complete-profile')
  try {
    const {
      auth_user_id,
      buyer_type,
      market_city,
      achievement_type,
    } = req.body;

    const { data, error } = await supabase
      .from("users")
      .insert({
        auth_user_id,
        buyer_type,
        market_city,
        achievement_type,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Profile created successfully.",
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const getCurrentUser = async (req, res) => {
  try {
    const { auth_user_id } = req.params;

    if (!auth_user_id) {
      return res.status(400).json({
        success: false,
        message: "auth_user_id is required.",
      });
    }

    // Fetch application user
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", auth_user_id)
      .single();

    if (profileError) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    // Fetch auth user
    const {
      data: { users },
      error: authError,
    } = await supabase.auth.admin.listUsers();

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    const authUser = users.find((u) => u.id === auth_user_id);

    if (!authUser) {
      return res.status(404).json({
        success: false,
        message: "Auth user not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        auth: {
          id: authUser.id,
          email: authUser.email,
          phone: authUser.phone,
          app_metadata: authUser.app_metadata,
          user_metadata: authUser.user_metadata,
          identities: authUser.identities,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          email_confirmed_at: authUser.email_confirmed_at,
        },
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};