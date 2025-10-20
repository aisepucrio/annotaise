import Image from "next/image";
import Sidebar from "./sidebar";

export default function Home() {
  return (
    <div className="bg-gray-300 h-screen">
      <Sidebar></Sidebar>
    </div>
  );
}
