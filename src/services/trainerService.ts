import { sendMail } from "../config/nodeMailer";
import bcrypt from "bcrypt";
import { v4 } from "uuid";
import { TrainerHistory, TrainerType } from "../interfaces/common/types";
import { generateAccessToken, generateRefreshToken } from "../config/jwtConfig";
import { EditTrainerInterface, IDietPlan } from "../interfaces/common/Interfaces";
import { ProfileUpdateResult } from "../interfaces/common/Interfaces";
import { ITrainerService } from "../interfaces/trainerService.interface";
import { ITrainerRepository } from "../interfaces/trainerRepository.interface";
import { getObjectURL, getVideos, UpdateToAws } from "../config/awsConfig";

export class TrainerService implements ITrainerService {
    private _trainerRepository: ITrainerRepository

    constructor(trainerRepository: ITrainerRepository) {
        this._trainerRepository = trainerRepository;
    }
    private otpStore: { [key: string]: { otp: string; timestamp: number; trainerData: TrainerType } } = {};

    async registerTrainerService(trainerData: TrainerType) {
        const alreadyExists = await this._trainerRepository.findTrainerInRegister(trainerData.email);
        if (alreadyExists) {
            return "UserExist";
        }

        const OTP: string = Math.floor(1000 + Math.random() * 9000).toString();
        console.log("Generated OTP: ", OTP);
        const isMailSended = await sendMail(trainerData.email, OTP);
        if (isMailSended) {
            this.storeOtp(trainerData.email, OTP, trainerData);
            console.log("OTP stored successfully");
            return OTP;
        } else {
            return "OTP not sent";
        }
    }


    storeOtp(email: string, otp: string, trainerData: TrainerType) {
        const timestamp = Date.now();
        this.otpStore[email] = { otp, timestamp, trainerData };
        console.log("Stored OTP data: ", this.otpStore);
    }


    async otpVerificationService(temperoryEmail: string, otp: string) {
        console.log("Current OTP store: ", this.otpStore);
        console.log("Verifying OTP for email: ", temperoryEmail);

        const storedData = this.otpStore[temperoryEmail];
        console.log("storedData: ", storedData);

        if (!storedData) {
            throw new Error("Invalid OTP");
        }

        const currentTime = Date.now();
        const otpTime = storedData.timestamp;
        const difference = currentTime - otpTime;

        if (difference > 2 * 60 * 1000) {
            throw new Error("OTP expired");
        }

        if (storedData.otp !== otp) {
            throw new Error("Invalid OTP");
        }

        console.log("OTP matched");

        const trainerData = storedData.trainerData;
        const hashedPassword = await bcrypt.hash(trainerData.password, 10);
        trainerData.password = hashedPassword;
        trainerData.trainerId = v4();
        delete this.otpStore[temperoryEmail];

        await this._trainerRepository.registerTrainer(trainerData);

        const { password, ...trainerDataWithoutSensitiveInfo } = trainerData;

        return { message: "OTP verified", trainerData: trainerDataWithoutSensitiveInfo };
    }


    async trainerLoginService(email: string, enteredPassword: string): Promise<any> {
        try {
            const trainerData = await this._trainerRepository.findTrainerInRegister(email);
            if (!trainerData) {
                return {
                    trainerNotExisted: true,
                    trainerData: null,
                    accessToken: null,
                    refreshToken: null
                };
            }

            const { password: hashedPassword, ...TrainerDataWithoutSensitiveData } = trainerData;
            const bcryptPass = await bcrypt.compare(enteredPassword, hashedPassword);

            const verifiedTrainer = trainerData.verified
            const isBlocked = trainerData.isBlocked


            const accessToken = generateAccessToken(trainerData.trainerId)
            const refreshToken = generateRefreshToken(trainerData.trainerId)

            return {
                trainerData: TrainerDataWithoutSensitiveData,
                bcryptPass,
                accessToken,
                refreshToken,
                verifiedTrainer,
                isBlocked,
            };
        } catch (error) {
            console.error("Error verifying password: ", error);
            return {
                trainerData: null,
                bcryptPass: false
            };
        }
    }


    async editTrainerService(name: string, phone: string, address: string, gender: string, qualification: string, achivements: string, trainerId: string, feePerMonth: string, experience: string) {
        const editTrainerData: EditTrainerInterface = {
            name,
            phone,
            address,
            gender,
            achivements,
            qualification,
            feePerMonth,
            experience,
        }
        console.log("Edit trainer service : ", editTrainerData)
        const res = await this._trainerRepository.editTrainer(editTrainerData, trainerId)
        console.log("Updation : ", res);

        if (!res.modifiedCount) {
            throw new Error("No changes found")
        }
        return { message: "Updated successfully" };
    }

    async verifyPassword(password: string, trainerId: string): Promise<boolean> {
        try {
            const trainer = await this._trainerRepository.findEditingData(trainerId);
            const storedPassword = trainer?.password;
            const bcryptPass = await bcrypt.compare(password, String(storedPassword));
            return bcryptPass;
        } catch (error) {
            console.error("Error verifying password: ", error);
            return false;
        }
    }

    async changeTrainerPass(newPassword: string, userId: string) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const res = await this._trainerRepository.changePass(hashedPassword, userId);
            if (res.modifiedCount === 0) {
                throw new Error("No changes found");
            }
            return { success: true, message: "Reset Password successfully" };
        } catch (error: any) {
            console.error("Error in reset password: ", error);
            return { success: false, message: error.message || "Internal server error" };
        }
    }

    async profileUpdate(trainerId: string, profileImage: any): Promise<ProfileUpdateResult | { success: boolean; message: string } | any> {
        try {
            const bucketName = "fitfusion-store"
            const profileKey = `trainerProfile/`;

            const uploadResult = await UpdateToAws(bucketName, profileKey, profileImage)

            const url = await getObjectURL(`trainerProfile/${uploadResult}`)

            const result = await this._trainerRepository.profileUpdate(trainerId, uploadResult);
            return { url, result };
        } catch (error: any) {
            console.error('Error in profile update: ', error);
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async fetchCustomer(userIds: string[]) {
        try {
            const result = await this._trainerRepository.fetchCustomer(userIds)
            return result
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async fetchDeitPlans(trainerId: string) {
        try {
            const result = await this._trainerRepository.fetchDeitPlans(trainerId)
            return result
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async addDietPlan(trainerId: string, dietPlan: Omit<IDietPlan, 'trainerId'>) {
        try {
            const existed = this._trainerRepository.existedDiet(trainerId, dietPlan.dietName)
            if (!existed) {
                const result = this._trainerRepository.AddDietPlan({ ...dietPlan, trainerId })
                return result;
            } else {
                throw new Error('A diet plan with this name already exists for this trainer');
            }
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async fetchAlreadyChatted(alreadyChatted: string[]) {
        try {
            const users = await this._trainerRepository.fetchAlreadyChatted(alreadyChatted);
            return users
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async saveVideoUrl(trainerId: string, videoFile: any, thumbnail: any, title: string, description: string): Promise<any> {
        try {
            const bucketName = "fitfusion-tutorial"
            const Key = `trainer/Videos/`;
            const thumnailKey = `trainer/thumbnails/`;
            
            console.log(videoFile);
            
            const videoUploadResult = await UpdateToAws(bucketName, Key, videoFile)
            const videoURL = await getObjectURL(`trainers/Videos/,${videoUploadResult}`)

            const thumbnailUploadResult = await UpdateToAws(bucketName, thumnailKey, thumbnail)
            const thumbnailURL = await getObjectURL(`trainers/thumbnails/,${thumbnailUploadResult}`)

            const result = await this._trainerRepository.videoUpload(trainerId, videoURL, thumbnailURL, title, description);
            return { videoURL, thumbnailURL, result }

        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async profileFetch(trainerId: string): Promise<any> {
        try {
            let trainerData = await this._trainerRepository.profileFetch(trainerId)
            trainerData = trainerData.toObject();
            const url = await getObjectURL(`trainerProfile/${trainerData.profileIMG}`)
            trainerData = { ...trainerData, profileIMG: url }
            return trainerData
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }

    async getVideos(trainerId: string): Promise<any>{
        try {
            let trainerVideo = await this._trainerRepository.getVideos(trainerId)
            const allVideos = await Promise.all (
                trainerVideo.videos.map(async(video: any) => {
                    const videoLink = await getVideos(`trainer/Videos/${video.videoUrl}`)
                    const thumbnailLink = await getVideos(`trainer/thumbnails/${video.thumbnail}`)    
                    return {
                        ...video,
                        videoUrl: videoLink,
                        thumbnail: thumbnailLink
                    };
                })
            )
            return allVideos
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' }; 
        }
    }

    async getTransaction(trainerId: string): Promise<TrainerHistory[] | any> {
        try {
            const result = await this._trainerRepository.getTransaction(trainerId)
            return result
        } catch (error: any) {
            return { success: false, message: error.message || 'Internal server error' };
        }
    }
}