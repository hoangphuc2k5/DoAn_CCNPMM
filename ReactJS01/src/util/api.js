import axios from './axios.customize';

const createUserApi = (name, email, password) => {
    const URL_API = "/v1/api/register";
    const data = {
        name, email, password
    }

    return axios.post(URL_API, data)
}

const loginApi = (email, password) => {
    const URL_API = "/v1/api/login";
    const data = {
        email, password
    }

    return axios.post(URL_API, data)
}

const getUserApi = () => {
    const URL_API = "/v1/api/user";
    return axios.get(URL_API)
}

const getAccountApi = () => {
    const URL_API = "/v1/api/account";
    return axios.get(URL_API)
}

const forgotPasswordApi = (email) => {
    const URL_API = "/v1/api/forgot-password";
    const data = { email };
    return axios.post(URL_API, data)
}

export {
    createUserApi, loginApi, getUserApi, getAccountApi, forgotPasswordApi
}
