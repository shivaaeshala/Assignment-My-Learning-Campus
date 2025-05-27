import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { data } from '../data/data';
import { LRUCache } from '../utils/LRUCache';
import '../App.css';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const HighlightMatch = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, index) =>
                regex.test(part) ? (
                    <strong key={index}>{part}</strong>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </span>
    );
};

export default function Search() {
    const [inputValue, setInputValue] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const cache = useMemo(() => new LRUCache(10), []);

    const debouncedInput = useDebounce(inputValue, 300);
    const listRef = useRef(null);

    const handleFilter = useCallback((value) => {
        const lowerCaseValue = value.toLowerCase();

        const cachedResult = cache.get(lowerCaseValue);
        if (cachedResult) {
            console.log(`Cache hit for: ${lowerCaseValue}`);
            setFilteredData(cachedResult);
            setShowSuggestions(true);
            return;
        }

        console.log(`Filtering for: ${lowerCaseValue}`);
        const results = data.filter(item =>
            item.name.toLowerCase().includes(lowerCaseValue)
        );

        cache.put(lowerCaseValue, results);

        setFilteredData(results);
        setShowSuggestions(true);
        setActiveIndex(-1);

    }, [cache]);

    useEffect(() => {
        if (debouncedInput) {
            handleFilter(debouncedInput);
        } else {
            setFilteredData([]);
            setShowSuggestions(false);
            setActiveIndex(-1);
        }
    }, [debouncedInput, handleFilter]);

    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeItem = listRef.current.children[activeIndex];
            if (activeItem) {
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }
        }
    }, [activeIndex]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleClearInput = () => {
        setInputValue('');
        setFilteredData([]);
        setShowSuggestions(false);
    };

    const handleSuggestionClick = (item) => {
        setInputValue(item.name);
        setShowSuggestions(false);
        setActiveIndex(-1);
    }

    const handleKeyDown = (e) => {
        if (!showSuggestions || filteredData.length === 0) {
            // If suggestions aren't showing or empty, reset and return
            setActiveIndex(-1);
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault(); // Prevent cursor moving
                setActiveIndex(prevIndex =>
                    prevIndex === filteredData.length - 1 ? 0 : prevIndex + 1
                );
                break;
            case 'ArrowUp':
                e.preventDefault(); // Prevent cursor moving
                setActiveIndex(prevIndex =>
                    prevIndex <= 0 ? filteredData.length - 1 : prevIndex - 1
                );
                break;
            case 'Enter':
                e.preventDefault(); // Prevent form submission
                if (activeIndex >= 0 && activeIndex < filteredData.length) {
                    handleSuggestionClick(filteredData[activeIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setActiveIndex(-1);
                break;
            default:
                break;
        }
    };

    return (
        <div className="search-wrapper">
            <div className="search-input-container">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search..."
                    className="search-input"
                    onFocus={() => setShowSuggestions(inputValue.length > 0)}
                // onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                />
                {inputValue && (
                    <button onClick={handleClearInput} className="clear-button">×</button>
                )}
            </div>
            {showSuggestions && filteredData.length > 0 && (
                <ul className="suggestions-list" ref={listRef}>
                    {filteredData.map((item, index) => (
                        <li key={item.id}
                            className={`suggestion-item ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => handleSuggestionClick(item)}
                            onMouseEnter={() => setActiveIndex(index)}
                        >

                            <HighlightMatch text={item.name} highlight={debouncedInput} />
                        </li>
                    ))}
                </ul>
            )}
            {showSuggestions && filteredData.length === 0 && inputValue.length > 0 && (
                <div className="no-results">No results found</div>
            )}
        </div>
    );
}