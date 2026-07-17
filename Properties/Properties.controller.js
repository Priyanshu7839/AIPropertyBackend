import { supabase } from "../Supabase.js";


const tableMap = {
    Residential: "residential_properties",
    Commercial: "commercial_properties",
    Mixed: "mixed_use_properties",
    Vacant: "land_properties",
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

        const tableMap = {
            Residential: "residential_properties",
            Commercial: "commercial_properties",
            Mixed: "mixed_use_properties",
            Vacant: "land_properties",
        };

        // Fetch all property types
        if (propertyType === "All") {
            const tables = [
                { type: "Residential", table: "residential_properties" },
                { type: "Commercial", table: "commercial_properties" },
                { type: "Mixed Use", table: "mixed_use_properties" },
                { type: "Land/Vacant Land", table: "land_properties" },
            ];

            const results = await Promise.all(
                tables.map(async ({ type, table }) => {
                    const { data, error } = await supabase
                        .from(table)
                        .select("*")
                        .eq("user_id", Number(user_id))
                        .order("created_at", { ascending: false });

                    if (error) throw error;

                    return data.map((property) => ({
                        ...property,
                        propertyType: type,
                    }));
                })
            );

            const allProperties = results
                .flat()
                .sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );

            return res.status(200).json({
                success: true,
                data: allProperties,
            });
        }

        // Fetch a single property type
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
            .eq("user_id", Number(user_id))
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        const formattedData = data.map((property) => ({
            ...property,
            propertyType,
        }));

        return res.status(200).json({
            success: true,
            data: formattedData,
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};


export const updateListingTypes = async (req, res) => {
    try {
        const { propertyType, property_id } = req.params;
        const { listingTypes } = req.body;

        console.log(listingTypes)

        const table = tableMap[propertyType];

        if (!table) {
            return res.status(400).json({
                success: false,
                message: "Invalid property type.",
            });
        }

        if (!Array.isArray(listingTypes)) {
            return res.status(400).json({
                success: false,
                message: "listingTypes must be an array.",
            });
        }

        const { data, error } = await supabase
            .from(table)
            .update({
                listing_types: listingTypes,
                updated_at: new Date().toISOString(),
            })
            .eq("property_id", Number(property_id))
            .select()
            .single();

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Listing types updated successfully.",
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