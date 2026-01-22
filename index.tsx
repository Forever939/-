import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Declare XLSX on window since we loaded it via script tag
declare global {
  interface Window {
    XLSX: any;
  }
}

// --- Types ---

type RawRow = Record<string, string>;

interface ProcessedLink {
  id: string;
  path: (string | null)[]; // Array of 4 items corresponding to the 4 columns
  frequency: number;
  type: 4 | 3 | 2; // Dimension count
}

interface ColumnData {
  title: string;
  keywords: { word: string; score: number }[]; // Sorted list of keywords for this column
}

type KeywordMap = Record<string, string[]>;

const DIMENSIONS = ['CMF', '感官', '认知', '社会'];
const COL_HEADERS_MAP: Record<string, string[]> = {
  CMF: ['CMF', 'CMF Keywords', 'cmf'],
  感官: ['感官', 'Perceptual', 'Perceptual Keywords', 'Sense', 'sensory'],
  认知: ['认知', 'Cognitive', 'Cognitive Keywords'],
  社会: ['社会', 'Social', 'Social Keywords'],
  人群: ['人群', 'Crowd', 'Target', 'Audience'],
  品牌: ['品牌', 'Brand']
};

// --- Helper Functions ---

const findHeader = (row: RawRow, possibleHeaders: string[]): string | undefined => {
  const keys = Object.keys(row);
  return keys.find(k => possibleHeaders.some(h => k.trim().toLowerCase().includes(h.toLowerCase())));
};

const splitValues = (str: any, separator = /[,，]/): string[] => {
  if (!str) return [];
  return String(str).split(separator).map(s => s.trim()).filter(Boolean);
};

const splitCrowd = (str: any): string[] => {
  if (!str) return [];
  return String(str).split(/[、,]/).map(s => s.trim()).filter(Boolean);
};

// --- Components ---

const FileUpload = ({ onDataLoaded }: { onDataLoaded: (data: RawRow[]) => void }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (data) {
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = window.XLSX.utils.sheet_to_json(sheet);
        onDataLoaded(jsonData as RawRow[]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
        ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-white'}`}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        accept=".xlsx,.xls" 
        className="hidden" 
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div className="text-gray-500">
        <p className="text-lg font-medium text-gray-700 mb-2">点击或拖拽上传 Excel 文件</p>
        <p className="text-sm text-gray-400">支持 .xlsx, .xls 格式</p>
      </div>
    </div>
  );
};

const KeywordEditor = ({ 
  data, 
  crow