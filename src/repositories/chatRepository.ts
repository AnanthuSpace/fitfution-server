import { ChatType, chatModel } from "../models/chatModal";
import { MessageType, MessageDetailType } from "../Interfaces";

export class ChatRepository {
  async createChat(userId: string, trainerId: string): Promise<ChatType> {
    const chat = new chatModel({ userId, trainerId, details: [] });
    return await chat.save();
  }

  async findChat(userId: string, trainerId: string): Promise<ChatType | null> {
    return await chatModel.findOne({ userId, trainerId }).exec();
  }

  async getMessages(senderId: string, receiverId: string): Promise<MessageDetailType[]> {
    const chat = await chatModel.findOne({ chatMembers: { $all: [senderId, receiverId] } })
    return chat ? chat.details : [];
  }

  async saveNewChatRepository(newMessageDetails: MessageDetailType) {
    try {
      return chatModel.updateOne(
        { chatMembers: { $all: [newMessageDetails.senderId, newMessageDetails.receiverId] } },
        { $push: { details: newMessageDetails } },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error during save new chat operation:", error);
      throw error;
    }
  };

  async createConnectionAndSaveMessageRepository(newChatDocument: MessageType) {
    try {
      return await chatModel.create(newChatDocument);
    } catch (error) {
      throw error;
    }
  };
}
