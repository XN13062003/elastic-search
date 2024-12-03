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
                            <li key={index} className="relative border border-gray-300 p-6 rounded-md shadow-md">
                                <a
                                    href={result.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-2 right-2 mr-6 text-blue-600 hover:underline"
                                >
                                    Xem chi tiết
                                </a>
                                <h3 className="text-lg font-bold text-left">{result.title}</h3>
                                <p className="text-gray-600 text-left">{result.description.match(/[^.!?]*[.!?]/)?.[0]}</p>
                                <p className="text-gray-600 text-left">
                                    <span className="font-bold mr-1 ">Nội dung:</span>
                                    {result.content
                                        .match(/[^.!?]*[.!?]/g) // Tìm tất cả các câu
                                        ?.slice(0, 3) // Lấy 3 câu đầu tiên
                                        .join(' ')}
                                </p>

                                <p className="text-gray-700 text-left"><span className="font-bold mr-1 ">Ngày, giờ đăng tin:</span> {result.date}</p>
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
