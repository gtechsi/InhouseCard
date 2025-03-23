import { useState } from 'react';
import { Profile } from '../types';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

interface PixPaymentProps {
  profile: Profile;
}

export default function PixPayment({ profile }: PixPaymentProps) {
  const [amount, setAmount] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  function calcularCRC16(payload: string) {
    let polinomio = 0x1021;
    let resultado = 0xFFFF;

    for (let i = 0; i < payload.length; i++) {
      resultado ^= (payload.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
        if ((resultado & 0x8000) !== 0) {
          resultado = (resultado << 1) ^ polinomio;
        } else {
          resultado <<= 1;
        }
        resultado &= 0xFFFF;
      }
    }
    return resultado.toString(16).toUpperCase().padStart(4, '0');
  }

  function formatarValor(valor: string): string {
    const numero = parseFloat(valor);
    if (isNaN(numero)) return '0.00';
    return Math.ceil(numero).toFixed(2);
  }

  function gerarPixCopiaCola() {
    if (!profile.pix) {
      toast.error('Chave PIX não configurada');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Insira um valor válido');
      return;
    }

    const valor = formatarValor(amount);
    const chavePix = profile.pix;
    // Remove todos os espaços e caracteres especiais do nome
    const nomeBeneficiario = profile.fullName.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9]/g, ''); // Remove caracteres especiais e espaços

    // Monta o payload do PIX
    const gui = "BR.GOV.BCB.PIX";
    const chavePixInfo = gui + chavePix.length.toString().padStart(2, '0') + chavePix;
    const merchantAccountInfo = "00" + gui.length.toString().padStart(2, '0') + gui + 
                              "01" + chavePix.length.toString().padStart(2, '0') + chavePix;
    
    let payload = ""
      + "000201" // Payload Format Indicator
      + "26" + merchantAccountInfo.length.toString().padStart(2, '0') + merchantAccountInfo // Merchant Account Information
      + "52040000" // Merchant Category Code
      + "5303986" // Transaction Currency
      + "54" + valor.length.toString().padStart(2, '0') + valor // Transaction Amount
      + "5802BR" // Country Code
      + "59" + nomeBeneficiario.length.toString().padStart(2, '0') + nomeBeneficiario // Merchant Name
      + "6304"; // CRC16
    
    let crc = calcularCRC16(payload);
    let codigoPix = payload + crc;
    
    setPixCode(codigoPix);
    setShowCode(true);
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(pixCode);
    toast.success('Código PIX copiado!');
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Pagamento PIX</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Chave PIX</p>
          <p className="font-medium">{profile.pix || 'Não configurada'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-1">Beneficiário</p>
          <p className="font-medium">{profile.fullName}</p>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm text-gray-600 mb-1">
            Valor (R$)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0,00"
            step="1"
            min="1"
          />
          <p className="text-xs text-gray-500 mt-1">
            O valor será arredondado para cima para o próximo número inteiro
          </p>
        </div>

        <button
          onClick={gerarPixCopiaCola}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-opacity-90 transition-colors"
          disabled={!profile.pix}
        >
          Gerar Código PIX
        </button>

        {showCode && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-center">
              <QRCodeSVG 
                value={pixCode}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">Código PIX:</p>
              <div className="bg-gray-50 p-3 rounded-md break-all font-mono text-sm">
                {pixCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="mt-2 w-full bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                Copiar Código
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}