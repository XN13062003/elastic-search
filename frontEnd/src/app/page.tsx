'use client'
import { useEffect, useState } from 'react';
import SearchComponent from "@/app/search-bar";
interface SearchResult {
    title: string;
    description: string;
    date: string;
    link: string;
    content: string;
}

const Home = () => {
    const [, setSearchResults] = useState<SearchResult[]>([]); // Sử dụng kiểu SearchResult

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

        </main>
    );
};

export default Home;
