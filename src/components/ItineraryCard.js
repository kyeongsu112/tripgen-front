import React from 'react';

const ItineraryCard = ({ time, location, description, onClick }) => {
    return (
        <div
            className="group relative flex items-start p-4 mb-4 bg-card rounded-xl shadow-sm border border-border hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer"
            onClick={onClick}
        >
            {/* Time Column */}
            <div className="flex-shrink-0 w-16 pt-1 mr-4 text-right">
                <span className="text-sm font-bold text-primary">{time}</span>
            </div>

            {/* Timeline Line (Visual only) */}
            <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-border group-last:hidden"></div>
            <div className="absolute left-[4.35rem] top-5 w-3 h-3 bg-accent rounded-full border-2 border-white z-10"></div>

            {/* Content Column */}
            <div className="flex-grow">
                <h3 className="text-lg font-semibold text-foreground mb-1">{location}</h3>
                <p className="text-sm text-foreground-70 line-clamp-2">{description}</p>
            </div>

            {/* Action Icon (Optional) */}
            <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
            </div>
        </div>
    );
};

export default ItineraryCard;
