import { Route, Routes } from "react-router-dom";
import HomeScreen from "./Components/HomeScreen";
import CallScreen from "./Components/CallScreen";

export default function RouteList() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/call/:username/:room" element={<CallScreen />} />
    </Routes>
  );
}
