import Navbar from "./components/Navbar";
import ListRoom from "./components/ListRoom";
import Room from "./components/Room";
import Setting from "./components/Setting";


function App() {
  return (
    <div className="grid grid-cols-12 h-screen bg-gray-100">
      <div className="col-span-1">
        <Navbar />
      </div>
      <div className="col-span-3">
        <ListRoom/>
      </div>
      <div className="col-span-5">
        <Room/>
      </div>
      <div className="col-span-3">
        <Setting/>
      </div>
    </div>
  );
}

export default App;
