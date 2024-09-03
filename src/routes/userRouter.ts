import { Router } from "express";
import { UserController } from "../controllers/userController";
import { verifyToken } from "../config/jwtConfig";

const router = Router()
const userController = new UserController()

router.post("/signup", userController.registerController);
router.post("/verify", userController.otpVerification);
router.post("/login", userController.userLogin);
router.post("/login-verify", userController.loginVerify);
router.put('/edit-user', verifyToken, userController.editUserData);
router.patch('/change-userpass', verifyToken, userController.changeUserPassword);
router.put('/user-details', verifyToken, userController.addUserDetails)
router.post('/blockuser', userController.blockeAUser)
router.get('/fetch-trainers', userController.fetchTrainers)
router.get('/fetch-user-trainer', verifyToken, userController.fetchUserTrainer)
router.post('/create-checkout-session', verifyToken, userController.createCheckoutSession)
router.post('/getTrainerByIds', verifyToken, userController.fetchAlreadyChattedTrainer)
router.get('/fetchDeitPlans', verifyToken, userController.fetchDeitPlans)
router.get('/fetchTrainerScroll', verifyToken, userController.fetchTrainerScroll)
router.post('/add-review',verifyToken, userController.addReview)
router.put('/inactive', verifyToken, userController.inactiveUser)

export default router