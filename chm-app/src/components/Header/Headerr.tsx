function Header() {
    const handleLogout = () => {
        localStorage.removeItem("usuario");
        window.location.href = "/login";
    };

    return (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>Sistema CHM</h3>

            <button onClick={handleLogout}>
                Sair
            </button>
        </div>
    );
}

export default Header;