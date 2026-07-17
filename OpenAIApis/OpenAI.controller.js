import OpenAI from "openai";
import dotenv from "dotenv";

import corePrompt from "../prompts/corePrompt.js";

import roadmapPrompt from "../prompts/createRoadmap.js";
import investmentPrompt from "../prompts/investmentOpportunitiesPrompt.js";
import fixerPrompt from "../prompts/fixerUpperPrompt.js";
import buyTimingPrompt from "../prompts/buyTimingprompt.js";
import rentalMarketsPrompt from "../prompts/rentalMarketPrompt.js";
import passiveIncomePrompt from "../prompts/passiveIncomePrompt.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
});

const workflowMap = {
    create_roadmap: roadmapPrompt,
    find_investment_opportunities: investmentPrompt,
    find_fixer_upper_deals: fixerPrompt,
    assess_buy_timing: buyTimingPrompt,
    rank_rental_markets: rentalMarketsPrompt,
    build_passive_income_plan: passiveIncomePrompt,
};

export async function chatbot(req, res) {
    try {

        const {
            intent,
            conversation
        } = req.body;


        

       
        

        const workflowPrompt = workflowMap[intent];

        if (!workflowPrompt) {
            return res.status(400).json({
                error: "Invalid workflow intent.",
            });
        }

        const response = await openai.responses.create({
            model: "gpt-4.1-mini",
            temperature: 0.2,
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: corePrompt,
                        },
                    ],
                },
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: workflowPrompt,
                        },
                    ],
                },
                ...conversation,
            ],
        });

        return res.status(200).json({
            msg: response.output_text,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: error.message,
        });

    }
}