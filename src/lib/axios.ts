import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorData = error.response?.data?.error;
    const errorMessage = errorData?.message || error.message || "Произошла ошибка при выполнении запроса";
    const customError = new Error(errorMessage);
    (customError as unknown as { code?: string; status?: number }).code = errorData?.code;
    (customError as unknown as { code?: string; status?: number }).status = error.response?.status;
    return Promise.reject(customError);
  }
);
