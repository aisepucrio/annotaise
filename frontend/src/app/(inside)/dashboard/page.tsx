"use client";

import PageHeader from "@/components/page_header";
import UseCurrent from "@/hooks/current_user_hook";

export default function Dashboard() {
  const user = UseCurrent();

  return (
    <>
      <PageHeader
        page_title="Dashboard"
        description="Nesta página você pode visualizar dados e estatísticas de todos os projetos em que participa."
      />
      <div className="">
        <h1 className="text-xl text-gray-800 bg-white w-full mt-5 ml-3 p-1 rounded-xl">
          Bem-vindo,{" "}
          {user ? user.first_name + " " + user.last_name : "Carregando..."}
        </h1>
      </div>
    </>
  );
}
