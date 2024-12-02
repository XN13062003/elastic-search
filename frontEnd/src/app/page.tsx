'use client'
import { useEffect, useState } from 'react';
import SearchComponent from "@/app/search-bar";
import CardComponent from "@/app/card"; // Đảm bảo bạn đã tạo component CardComponent

interface SearchResult {
    title: string;
    description: string;
    date: string;
    link: string;
    paragram: string;
}

const Home = () => {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]); // Sử dụng kiểu SearchResult

    useEffect(() => {
        const savedResults = sessionStorage.getItem('searchResults');
        if (savedResults) {
            setSearchResults(JSON.parse(savedResults));
        }
    }, []);

    return (
        <main className="min-h-screen bg-gray-100 items-center justify-center py-10">
            <div className="text-center mb-10">
                <h1 className="text-8xl font-extrabold mb-6 text-gray-900">Elastic Search</h1>
                <SearchComponent />
            </div>

            {/* Hiển thị kết quả tìm kiếm */}
            {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((result, index) => (
                        <CardComponent key={index} {...result} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-600">Không có kết quả tìm kiếm.</p>
            )}
        </main>
    );
};

export default Home;
