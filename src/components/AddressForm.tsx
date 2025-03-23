import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface AddressFormProps {
  currentAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  };
  onSuccess: () => void;
}

export default function AddressForm({ currentAddress, onSuccess }: AddressFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    street: currentAddress?.street || '',
    number: currentAddress?.number || '',
    complement: currentAddress?.complement || '',
    neighborhood: currentAddress?.neighborhood || '',
    city: currentAddress?.city || '',
    state: currentAddress?.state || '',
    zipcode: currentAddress?.zipcode || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Update profile with new address
      const profileRef = doc(db, 'profiles', user.id);
      await updateDoc(profileRef, {
        shipping_address: address,
        updatedAt: new Date().toISOString()
      });

      toast.success('Endereço atualizado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Erro ao atualizar endereço');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group md:col-span-2">
          <label htmlFor="zipcode" className="form-label">CEP *</label>
          <input
            id="zipcode"
            type="text"
            value={address.zipcode}
            onChange={(e) => setAddress({ ...address, zipcode: e.target.value })}
            className="input-field"
            placeholder="00000-000"
            required
            maxLength={9}
          />
        </div>

        <div className="form-group md:col-span-2">
          <label htmlFor="street" className="form-label">Rua *</label>
          <input
            id="street"
            type="text"
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
            className="input-field"
            placeholder="Nome da rua"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="number" className="form-label">Número *</label>
          <input
            id="number"
            type="text"
            value={address.number}
            onChange={(e) => setAddress({ ...address, number: e.target.value })}
            className="input-field"
            placeholder="123"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="complement" className="form-label">Complemento</label>
          <input
            id="complement"
            type="text"
            value={address.complement}
            onChange={(e) => setAddress({ ...address, complement: e.target.value })}
            className="input-field"
            placeholder="Apto 101"
          />
        </div>

        <div className="form-group md:col-span-2">
          <label htmlFor="neighborhood" className="form-label">Bairro *</label>
          <input
            id="neighborhood"
            type="text"
            value={address.neighborhood}
            onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
            className="input-field"
            placeholder="Nome do bairro"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="city" className="form-label">Cidade *</label>
          <input
            id="city"
            type="text"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            className="input-field"
            placeholder="Nome da cidade"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="state" className="form-label">Estado *</label>
          <select
            id="state"
            value={address.state}
            onChange={(e) => setAddress({ ...address, state: e.target.value })}
            className="input-field"
            required
          >
            <option value="">Selecione...</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Salvando...' : 'Salvar Endereço'}
        </button>
      </div>
    </form>
  );
}