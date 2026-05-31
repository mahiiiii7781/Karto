import { launchImageLibrary } from "react-native-image-picker";
import apiClient from "@/api/apiClient";

export const imageUploadService = {
  pickAndUpload: async (folder: string = "misc") => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.didCancel || !result.assets?.length) {
      return null;
    }

    const image = result.assets[0];

    const formData = new FormData();

    formData.append("folder", folder);

    formData.append("image", {
      uri: image.uri,
      type: image.type || "image/jpeg",
      name: image.fileName || `karto-${Date.now()}.jpg`,
    } as any);

    const res = await apiClient.post("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data.imageUrl as string;
  },
};