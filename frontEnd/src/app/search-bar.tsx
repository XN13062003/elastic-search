'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

interface SearchResult {
    title: string;
    description: string;
    date: string;
    link: string;
    content: string;
}

const SearchComponent: React.FC = () => {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BACKEND}/elastic/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: searchText }),
            });
            const data = await response.json();
            setSearchResults(data.data || []);
            setSearchText('');
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    };

    return (
        <div className="flex-1 flex flex-col max-w-[80%] mx-auto justify-center">
            {/* Form tìm kiếm */}
            <form
                onSubmit={handleSearch}
                className="flex w-full max-w-full mb-4"
                encType="multipart/form-data"
            >
                <input
                    className="border border-gray-400 p-2 rounded-l-md w-full"
                    type="text"
                    placeholder="Nhập từ khóa để tìm kiếm ..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-[#38CB89] text-white p-2 rounded-r-md flex items-center"
                >
                    <FontAwesomeIcon icon={faSearch} />
                </button>
            </form>

            {/* Kết quả tìm kiếm */}
            <div className="mt-4">
                {searchResults.length > 0 ? (
                    <ul className="space-y-4">
                        {searchResults.map((result, index) => (
                            <li key={index} className="border border-gray-300 p-4 rounded-md shadow-sm">
                                <h3 className="text-lg font-bold">{result.title}</h3>
                                <p className="text-gray-600">{result.description}</p>
                                <p className="text-gray-600">{result.content}</p>
                                <p className="text-sm text-gray-500">Ngày: {result.date}</p>
                                <a
                                    href={result.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Xem chi tiết
                                </a>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Không có kết quả tìm kiếm nào.</p>
                )}
            </div>
        </div>
    );
};

export default SearchComponent;
