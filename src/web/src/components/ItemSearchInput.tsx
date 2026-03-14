import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SkyblockItem {
  id: string;
  name: string;
  tier?: string;
  category?: string;
  material?: string;
}

interface ItemSearchInputProps {
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ItemSearchInput({ 
  value, 
  onChange, 
  placeholder = "Search item...",
  className = ""
}: ItemSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<SkyblockItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SkyblockItem | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si cambia el valor desde afuera, actualizar el item seleccionado
  useEffect(() => {
    if (value && !selectedItem) {
      // Buscar el item por ID
      fetch(`/api/skyblock-items?q=${value}`)
        .then(r => r.json())
        .then(data => {
          const item = data.items?.find((i: SkyblockItem) => i.id === value);
          if (item) {
            setSelectedItem(item);
          }
        })
        .catch(() => {});
    }
  }, [value]);

  // Buscar items cuando cambia el término de búsqueda
  useEffect(() => {
    const searchItems = async () => {
      if (searchTerm.length < 2) {
        setItems([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/skyblock-items?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        setItems(data.items || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Error searching items:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchItems, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectItem = (item: SkyblockItem) => {
    setSelectedItem(item);
    setSearchTerm('');
    setIsOpen(false);
    onChange(item.id);
  };

  const handleClear = () => {
    setSelectedItem(null);
    setSearchTerm('');
    onChange('');
  };

  const getTierColor = (tier?: string) => {
    switch (tier?.toUpperCase()) {
      case 'COMMON': return 'text-gray-400';
      case 'UNCOMMON': return 'text-green-400';
      case 'RARE': return 'text-blue-400';
      case 'EPIC': return 'text-purple-400';
      case 'LEGENDARY': return 'text-yellow-400';
      case 'MYTHIC': return 'text-pink-400';
      case 'DIVINE': return 'text-cyan-400';
      case 'SPECIAL': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {selectedItem ? (
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className={`text-sm font-semibold ${getTierColor(selectedItem.tier)}`}>
              {selectedItem.name}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              ID: {selectedItem.id}
              {selectedItem.category && ` • ${selectedItem.category}`}
            </span>
          </div>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
              placeholder={placeholder}
              className="h-9 rounded-xl text-sm pl-9"
            />
          </div>

          {/* Dropdown de sugerencias */}
          {isOpen && filteredItems.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[9999]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  <div className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              ) : items.length > 0 ? (
                <ul className="py-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleSelectItem(item)}
                        className="w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border/30 last:border-b-0"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-sm font-semibold ${getTierColor(item.tier)}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            ID: {item.id}
                            {item.tier && ` • ${item.tier}`}
                            {item.category && ` • ${item.category}`}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : searchTerm.length >= 2 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  No items found
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

