"use client";
import Image from "next/image";
import type { Listing } from "../types";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

interface PropertyCardProps {
  listing: Listing;
  onClick: () => void;
  id?: string;
}

export default function PropertyCard({ listing, onClick, id }: PropertyCardProps) {
  return (
    <article 
      id={id}
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-card ring-1 ring-border bg-surface shadow-sm transition-all duration-300 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-border/40">
        <Image src={listing.photoUrl} alt={listing.addressLine1} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute top-3 left-3">
          <span className="inline-block rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-main">
            {listing.status.replace("_", " ")}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-1 text-xl font-bold text-text-main">{currency.format(listing.price)}</div>
        <div className="truncate text-sm font-medium text-text-main">{listing.addressLine1}</div>
        <div className="mt-3 flex gap-3 text-xs text-text-muted">
          <span className="font-bold text-text-main">{listing.beds} bds</span>
          <span className="font-bold text-text-main">{listing.baths} ba</span>
          <span className="font-bold text-text-main">{listing.sqft.toLocaleString()} sqft</span>
        </div>
      </div>
    </article>
  );
}