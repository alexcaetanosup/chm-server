import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const gerarReciboPDF = (
  listaParcelas: any[],
  dados: any,
  pacienteNome: string,
  medicoNome: string,
  especialidadeNome: string
) => {

  const doc: any = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);

  doc.text("CAIXA DE HONORÁRIOS MÉDICOS", pageWidth / 2, 16, { align: "center" });

  const numeroRecibo = String(Date.now()).slice(-6).padStart(6, "0");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text(`Recibo Nº ${numeroRecibo}`, pageWidth - 20, 16, { align: "right" });

  doc.text(
    `Emitido em: ${new Date().toLocaleDateString("pt-BR")}`,
    pageWidth - 20,
    22,
    { align: "right" }
  );

  doc.setFontSize(13);

  doc.text(
    "RECIBO DE ATENDIMENTO MÉDICO",
    pageWidth / 2,
    26,
    { align: "center" }
  );

  doc.rect(14, 32, pageWidth - 28, 26);

  doc.setFontSize(10);

  doc.text(`Paciente: ${pacienteNome}`, 18, 40);
  doc.text(`Médico: ${medicoNome}`, 18, 46);
  doc.text(`Especialidade: ${especialidadeNome}`, 18, 52);

  doc.text(
    `Data Atendimento: ${new Date(dados.DATATEND || Date.now()).toLocaleDateString("pt-BR")}`,
    120,
    40
  );

  doc.text(`Plano: ${dados.PLANO}`, 120, 46);

  const rows = listaParcelas.map(p => [
    p.PARCELA,
    new Date(p.DTPARCELA).toLocaleDateString("pt-BR"),
    Number(p.VLPARCELA).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  ]);

  autoTable(doc, {
    startY: 65,
    head: [["Parcela", "Vencimento", "Valor"]],
    body: rows,
    theme: "grid"
  });

  let y = doc.lastAutoTable.finalY + 10;

  const subtotal = listaParcelas.reduce((acc, p) => acc + Number(p.VLPARCELA), 0);
  const taxa = subtotal * 0.05;
  const total = subtotal - taxa;

  const direita = pageWidth - 50;

  doc.text(
    `Subtotal: ${subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    direita,
    y
  );

  y += 6;

  doc.text(
    `Taxa 5%: ${taxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    direita,
    y
  );

  y += 6;

  doc.setFont("helvetica", "bold");

  doc.text(
    `TOTAL: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    direita,
    y
  );

  doc.setFont("helvetica", "normal");

  y += 25;

  doc.text("__________________________", pageWidth / 2 - 25, y);
  y += 6;

  doc.text("Assinatura do Médico", pageWidth / 2 - 20, y);

  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {

    doc.setPage(i);

    doc.setFontSize(8);

    doc.text(
      "ACS.Info - Alex Caetano dos Santos | CHM Gestão",
      14,
      272
    );

    doc.text(
      `Página ${i} de ${pageCount}`,
      180,
      272
    );

  }

  doc.save(`Recibo_${pacienteNome}-${dados.DATATEND}.pdf`);

};
