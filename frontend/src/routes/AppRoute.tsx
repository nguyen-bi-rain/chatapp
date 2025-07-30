import { BrowserRouter, Route, Routes } from "react-router-dom"
import Login from "../pages/Login"
import Register from "../pages/Register"
import ChatContainer from "../components/ChatContainer"


const AppRoute = () => {
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<ChatContainer/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoute