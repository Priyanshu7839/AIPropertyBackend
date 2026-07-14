import { supabase } from "../Supabase.js";


const tableMap = {
    Residential: "residential_properties",
    Commercial: "commercial_properties",
    "Mixed Use": "mixed_use_properties",
    "Land/Vacant Land": "land_properties",
};

const toSnakeCase = (obj) => {
    const converted = {};

    Object.entries(obj).forEach(([key, value]) => {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

        converted[snakeKey] = value === "" ? null : value;
    });

    return converted;
};

export const createProperty = async (req, res) => {
    try {
        const { user_id, propertyType } = req.params;
        const propertyData = req.body;

        if (!tableMap[propertyType]) {
            return res.status(400).json({
                success: false,
                message: "Invalid property type.",
            });
        }

        if (!propertyData.propertyName?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Property name is required.",
            });
        }

        const table = tableMap[propertyType];

        const formattedData = {
            ...toSnakeCase(propertyData),
            user_id: Number(user_id),
        };

        const { data, error } = await supabase
            .from(table)
            .insert(formattedData)
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
            message: "Property created successfully.",
            data,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};


export const getProperty = async (req, res) => {
    try {
        const { user_id, propertyType } = req.params;

        const table = tableMap[propertyType];

        if (!table) {
            return res.status(400).json({
                success: false,
                message: "Invalid property type.",
            });
        }

        const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("user_id", Number(user_id));

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};