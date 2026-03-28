import { useState, useEffect } from 'react';
import { AddressBook, type Contact } from '../../services/AddressBook';

interface AddressBookModalProps {
  onClose: () => void;
  onSelectAddress?: (address: string) => void;
  onMessage: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function AddressBookModal({ onClose, onSelectAddress, onMessage }: AddressBookModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    const allContacts = AddressBook.getContacts();
    setContacts(allContacts);
  };

  const handleAddContact = () => {
    if (!name.trim()) {
      onMessage('Ingresa un nombre', 'error');
      return;
    }

    if (!address.trim() || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      onMessage('Dirección inválida', 'error');
      return;
    }

    try {
      if (editingContact) {
        AddressBook.updateContact(editingContact.id, { name, address, note });
        onMessage('Contacto actualizado', 'success');
      } else {
        AddressBook.addContact(name, address, note);
        onMessage('Contacto agregado', 'success');
      }
      
      loadContacts();
      resetForm();
    } catch (error: any) {
      onMessage(error.message, 'error');
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setAddress(contact.address);
    setNote(contact.note || '');
    setShowAddForm(true);
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm('¿Eliminar este contacto?')) {
      AddressBook.deleteContact(id);
      loadContacts();
      onMessage('Contacto eliminado', 'info');
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingContact(null);
    setName('');
    setAddress('');
    setNote('');
  };

  const filteredContacts = searchQuery
    ? AddressBook.searchByName(searchQuery)
    : contacts;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>Libreta de Direcciones</h3>
          <button onClick={onClose} className="modal-close">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {!showAddForm ? (
            <>
              <div className="input-group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="modal-input"
                />
              </div>

              <button
                onClick={() => setShowAddForm(true)}
                className="modal-btn primary"
                style={{ marginBottom: '15px' }}
              >
                <i className="fas fa-plus"></i>
                Agregar Contacto
              </button>

              <div className="contacts-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredContacts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    <i className="fas fa-address-book" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                    <p>No hay contactos guardados</p>
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <div key={contact.id} className="contact-item" style={{
                      padding: '15px',
                      background: '#2a2d3a',
                      borderRadius: '8px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{contact.name}</div>
                          <div style={{ fontSize: '0.85em', color: '#888', wordBreak: 'break-all' }}>
                            {contact.address}
                          </div>
                          {contact.note && (
                            <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: '5px' }}>
                              {contact.note}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                          {onSelectAddress && (
                            <button
                              onClick={() => {
                                onSelectAddress(contact.address);
                                onClose();
                              }}
                              className="icon-btn"
                              title="Usar dirección"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleEditContact(contact)}
                            className="icon-btn"
                            title="Editar"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="icon-btn"
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="modal-input"
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label>Dirección</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="modal-input"
                />
              </div>

              <div className="input-group">
                <label>Nota (opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Amigo, Cliente, etc."
                  className="modal-input"
                />
              </div>

              <div className="modal-actions">
                <button onClick={handleAddContact} className="modal-btn primary">
                  <i className="fas fa-save"></i>
                  {editingContact ? 'Actualizar' : 'Guardar'}
                </button>
                <button onClick={resetForm} className="modal-btn secondary">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
