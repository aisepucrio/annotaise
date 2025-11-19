"use client";

import Sidebar from "./components/sidebar";
import PageHeader from "./components/page_description";
import UseCurrent from "./hooks/current_user_hook";

export default function Home() {

  const user = UseCurrent();

  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader page_title="Home" description="Aqui Você Pode Ver Seus Dashboards etc etc etc etc etc" />
        <div className="">
          <h1 className="text-xl text-gray-800 bg-white w-fit mt-5 ml-3 p-1 rounded-xl">Bem-vindo, {user ? user.first_name + " " + user.last_name : "Carregando..."}</h1>
        </div>
      </div>
    </div>
  );
}
