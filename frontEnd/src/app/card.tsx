import React from "react";

interface RecordProps {
    title: string;
    description: string;
    date: string;
    link: string;
    content: string;
}

const RecordCard: React.FC<RecordProps> = ({ title, description, date, link, content }) => {
    return (
        <div className="max-w-4xl mx-auto p-6 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">{title}</h2>
            <p className="text-sm text-gray-500 mb-4">{date.split('.')[0]}</p>
            <p className="text-gray-700 mb-4">{description.split('.')[0]}</p>
            <p className="text-gray-800 mb-6">{content.split('.')[0]}</p>
            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
            >
                Link
            </a>

            <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
            >
                Đọc thêm
            </a>
        </div>
    );
};

export default RecordCard;
