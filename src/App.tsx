import { Routes, Route } from "react-router-dom";

import { Toaster } from "react-hot-toast";

import Home from "./pages/Home";
import CreateEmployee from "./pages/CreateEmployee";
import UpdateEmployee from "./pages/UpdateEmployee";
const App: React.FC = () => {
  return (
    <main>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-employee" element={<CreateEmployee />} />
        <Route path="/update-employee" element={<UpdateEmployee />} />
      </Routes>
    </main>
  );
}

export default App;