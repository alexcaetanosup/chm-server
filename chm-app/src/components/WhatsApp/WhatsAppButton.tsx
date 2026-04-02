import React from 'react';

const WhatsAppButton: React.FC = () => {
    const phoneNumber = "5515997686416";
    const message = encodeURIComponent("Olá Alex, vi seu site e gostaria de falar sobre um projeto.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    return (
        <div className="wa-component-wrapper" style={{ position: 'fixed', bottom: '32px', left: '32px', zIndex: 99999 }}>
            <style>{`
        @keyframes wa-pulse-animation {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        .wa-main-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none !important;
        }
        .wa-circle-btn {
          width: 60px;
          height: 60px;
          background-color: #25D366;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          animation: wa-pulse-animation 2s infinite;
          transition: all 0.3s ease;
        }
        .wa-circle-btn:hover {
          transform: scale(1.15);
          background-color: #20ba5a;
        }
        .wa-text-label {
          background-color: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: bold;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
          pointer-events: none;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(4px);
        }
        .wa-main-link:hover .wa-text-label {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>

            <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="wa-main-link"
                onClick={(e) => e.stopPropagation()} // Impede que o clique suba para o pai
            >
                <div className="wa-circle-btn">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.398.16 12.006c0 2.112.553 4.174 1.604 6.012l-1.704 6.223 6.366-1.669c1.808.986 3.848 1.508 5.923 1.508h.005c6.554 0 11.89-5.399 11.89-12.007 0-3.202-1.244-6.212-3.503-8.471z" />
                    </svg>
                </div>
                <span className="wa-text-label">
                    Qualquer dúvida? <br />
                    Falar com Alex</span>
            </a>
        </div>
    );
};

export default WhatsAppButton;

// import React from 'react';

// const WhatsAppButton: React.FC = () => {
//     // Configuração do link direto (Votorantim - SP)
//     const phoneNumber = "5515997686416";
//     const message = encodeURIComponent("Olá Alex! Vi seu site e gostaria de falar sobre um projeto.");
//     const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

//     return (
//         <a
//             href={whatsappUrl}
//             target="_blank"
//             rel="noreferrer"
//             className="fixed bottom-8 left-8 z-[9999] group flex items-center gap-3 no-underline"
//         >
//             {/* Label que aparece no Hover */}
//             <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm border border-white/10 whitespace-nowrap">
//                 Qualquer dúvida? <br />
//                 Falar com Alex..
//             </span>

//             {/* Círculo do WhatsApp */}
//             <div className="relative flex h-14 w-14 items-center justify-center bg-[#25D366] rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:shadow-[0_8px_40px_rgb(37,211,102,0.6)] transition-all duration-300 hover:-translate-y-1 active:scale-95">

//                 {/* Ícone SVG */}
//                 <svg
//                     width="30"
//                     height="30"
//                     viewBox="0 0 24 24"
//                     fill="white"
//                     xmlns="http://www.w3.org/2000/svg"
//                 >
//                     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.398.16 12.006c0 2.112.553 4.174 1.604 6.012l-1.704 6.223 6.366-1.669c1.808.986 3.848 1.508 5.923 1.508h.005c6.554 0 11.89-5.399 11.89-12.007 0-3.202-1.244-6.212-3.503-8.471z" />
//                 </svg>

//                 {/* Efeito de Ping/Pulso */}
//                 <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20"></span>
//             </div>
//         </a>
//     );
// };

// export default WhatsAppButton;