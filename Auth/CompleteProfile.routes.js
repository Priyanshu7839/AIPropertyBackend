import express from 'express'
import { completeProfile, getCurrentUser } from './CompletProfile.controller.js';

const Router = express.Router()


Router.post("/complete-profile", completeProfile);
Router.get("/current-user/:auth_user_id", getCurrentUser);






export default Router