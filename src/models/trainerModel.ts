import { Schema, model } from "mongoose";
import { TrainerType } from "../types";

const trainerSchema = new Schema<TrainerType>({
    trainerId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String
    },
    gender: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    profileIMG: {
        type: String
    },
    address: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    followers: [{
        type: String
    }],
    rating: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 3
    },
    achivements: {
        type: String
    },
    qualification: {
        type: String
    },
    verified: {
        type: String,
        default: "pending",
    },
    feePerMonth: {
        type: String,
    },
    payedUsers: [{
        type: String,
    }],
    experience: {
        type: String
    },
    subscribedUsers: [{
        type: String,
        unique: true
    }],
    alreadychattedUsers: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: false
    }
})


const trainerModel = model<TrainerType>("Trainer", trainerSchema)

export { trainerModel };