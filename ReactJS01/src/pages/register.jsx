import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { notification } from 'antd';
import { registerUser, resetRegister } from '../redux/registerSlice';

const initialFormData = {
    name: '',
    email: '',
    password: ''
};
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import AuthLayout from "../components/auth/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { registerThunk } from "../Redux/authSlice";

const RegisterPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { loading, error, success } = useSelector((state) => state.register);

    const [formData, setFormData] = useState(initialFormData);
    const [validationError, setValidationError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (validationError) {
            setValidationError('');
        }

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim();

        if (!trimmedName || !trimmedEmail || !formData.password) {
            return 'Please fill in all required fields.';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return 'Email format is invalid.';
        }

        if (formData.password.length < 6) {
            return 'Password must be at least 6 characters.';
        }

        return '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const formError = validateForm();
        if (formError) {
            setValidationError(formError);
            return;
        }

        dispatch(registerUser({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password
        }));
    };

    useEffect(() => {
        if (success) {
            notification.success({
                message: 'Register user',
                description: 'Account created successfully.'
            });
            setFormData(initialFormData);
            navigate('/login');
            dispatch(resetRegister());
        }

        if (error) {
            notification.error({
                message: 'Register user',
                description: error
            });
            dispatch(resetRegister());
    const { loading, error } = useSelector((state) => state.auth);
    const [formState, setFormState] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [localError, setLocalError] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormState((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");
        if (!formState.name || !formState.email || !formState.password) {
            setLocalError("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        const result = await dispatch(registerThunk(formState));
        if (registerThunk.fulfilled.match(result)) {
            navigate("/login");
        }
    }, [success, error, navigate, dispatch]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create an account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Register with your email to continue
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {validationError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {validationError}
                        </div>
                    ) : null}

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="name" className="sr-only">
                                Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Your name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? 'Creating account...' : 'Register'}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link to="/" className="text-indigo-600 hover:text-indigo-500">
                            Back to home
                        </Link>
                    </div>
                    <div className="text-center">
                        <span className="text-gray-600">Already have an account? </span>
                        <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
                            Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
        <AuthLayout
            title="Tạo tài khoản mới"
            subtitle="Đăng ký để bắt đầu quản lý dự án, theo dõi tiến độ và nhận thông báo." 
            footer={
                <span>
                    Đã có tài khoản?{" "}
                    <Link className="text-reef hover:text-ink" to="/login">
                        Đăng nhập ngay
                    </Link>
                </span>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                    label="Họ và tên"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    placeholder="Nguyen Van A"
                />
                <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleChange}
                    placeholder="you@email.com"
                />
                <Input
                    label="Mật khẩu"
                    name="password"
                    type="password"
                    value={formState.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                />
                {localError || error ? (
                    <div className="rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
                        {localError || error}
                    </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                    <Button type="submit" loading={loading} className="w-full">
                        Tạo tài khoản
                    </Button>
                    <Link to="/" className="w-full">
                        <Button variant="ghost" className="w-full">
                            Về trang chủ
                        </Button>
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
