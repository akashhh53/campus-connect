import {Routes, Route } from "react-router";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Homepage from "./pages/Homepage";

function App(){

  return(
  <>
    <Routes>
      <Route path="/" element={<Homepage></Homepage>}></Route>
      <Route path="/login" element={<Login></Login>}></Route>
      <Route path="/signup" element={<Signup></Signup>}></Route>
    </Routes>
  </>
  )
}

export default App;