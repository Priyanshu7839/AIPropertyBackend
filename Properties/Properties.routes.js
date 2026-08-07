import express from 'express'
import { createProperty, getChatMessages, getDailyBriefing, getProperty, getRoadmapName, getUserChatIds, saveChat, updateListingTypes } from './Properties.controller.js';

const Router = express.Router()




Router.post("/add/:user_id/:propertyType", createProperty);

Router.get("/fetch/:user_id/:propertyType", getProperty);

Router.post(
    "/update/:propertyType/:property_id/listing-types",
    updateListingTypes
);


Router.get('/getBriefing',getDailyBriefing)
Router.post('/saveUserChat',saveChat)
Router.post("/get-ai-roadmap-title", getRoadmapName);
Router.post("/getChats",getUserChatIds)
Router.get("/getChatDetails/:chat_id",getChatMessages)

export default Router