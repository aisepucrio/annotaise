import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="bg-gray-200  p-4 min-h-screen">
        <Image
            src="/full_logo_icon.svg"
            alt="Logo"
            width={490}
            height={100}
            className="mx-auto mb-6 mt-20"
        />
        <div className="mt-15 max-w-sm mx-auto bg-white p-8 rounded-lg shadow-2xl">
            <div className="flex flex-col gap-0 items-center font-montserrat">
                <h2 className="text-2xl font-semibold mb-2 text-center text-blue-950">Login</h2>
                <span className="text-gray-500 text-center text-sm">Faça o Login para acessar e rotular seus dados</span>
            </div>
            <div className="mt-4 relative w-80">
                {/* Label flutuando na borda */}
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
                    Email
                </label>

                <input
                    type="email"
                    placeholder="Digite seu email..."
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />

                {/* Ícone */}
                <svg
                    className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0l-9.75 6L2.25 6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75"
                    />
                </svg>
            </div>
            <div className="mt-4 relative w-80">
                {/* Label flutuando na borda */}
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">
                    Senha
                </label>

                <input
                    type="email"
                    placeholder="Digite seu senha..."
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />

                {/* Ícone */}
                <svg
                    className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0l-9.75 6L2.25 6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75"
                    />
                </svg>
            </div>
            <div className="flex w-80 justify-end mt-3">
                <a className="text-xs  text-blue-600 underline">Esqueceu a senha?</a>
            </div>

            <button
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-900
                           hover:bg-blue-800 text-white px-4 py-3 shadow-md text-sm transition-colors cursor-pointer"
            >
              Login
            </button>

        </div>

    </div>
  );
}