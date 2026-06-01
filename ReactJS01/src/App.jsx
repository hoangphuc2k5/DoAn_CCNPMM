import { Outlet } from "react-router-dom";
import Header from "./components/layout/header";
import { useEffect } from "react";
import { Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { fetchAccountThunk } from "./Redux/authSlice";

function App() {

    const dispatch = useDispatch();
    const { appLoading } = useSelector((state) => state.auth);

    useEffect(() => {
        let isMounted = true;

        const fetchAccount = async () => {
            if (!isMounted) return;

            const accessToken = localStorage.getItem("access_token");
            if (!accessToken) {
                setAppLoading(false);
                return;
            }

            setAppLoading(true);

            try {
                const res = await axios.get(`/v1/api/user`);

                if (res && !res.message && isMounted) {
                    setAuth({
                        isAuthenticated: true,
                        user: {
                            email: res.email,
                            name: res.name
                        }
                    })
                }
            } catch (error) {
                console.error("Khong the tai thong tin nguoi dung:", error);
            } finally {
                if (isMounted) {
                    setAppLoading(false);
                }
            }
        }

        fetchAccount()

        return () => {
            isMounted = false;
        }
    }, [])
        dispatch(fetchAccountThunk());
    }, [dispatch]);

    return (
        <div>
            {appLoading === true ?
                <div style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)"
                }}>

                    <Spin />

                </div>
                :
                <>
                    <Header />
                    <Outlet />
                </>
            }
        </div>
    )
}

export default App
