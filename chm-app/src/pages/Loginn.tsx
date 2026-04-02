import axios from "axios";
import { useState } from "react";

export default function Login() {
    const [login, setLogin] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");

    const handleLogin = async () => {
        try {
            const res = await axios.post("http://localhost:4000/api/login-simples", {
                login,
                senha,
            });

            // salva apenas flag de login
            localStorage.setItem("usuario", JSON.stringify(res.data.usuario));

            window.location.href = "/dashboard";
        } catch (err: any) {
            setErro(err.response?.data?.error || "Erro ao logar");
        }
    };

    return (
        <div style={{ maxWidth: 300, margin: "100px auto" }}>
            <h2>Login</h2>

            <input
                placeholder="Usuário"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
            />

            <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
            />

            <button onClick={handleLogin}>Entrar</button>

            {erro && <p style={{ color: "red" }}>{erro}</p>}
        </div>
    );
}