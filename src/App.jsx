import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, Crop, Download, Image as ImageIcon, ChevronRight, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import getCroppedImg from './cropUtils';
import './index.css';

function App() {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [croppedImages, setCroppedImages] = useState([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [paperSize, setPaperSize] = useState('6x4');
  const [paperOrientation, setPaperOrientation] = useState('portrait');
  const [position, setPosition] = useState('top-left');
  const fileInputRef = useRef(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const urls = await Promise.all(files.map(file => readFile(file)));
      setUploadedImages(urls);
      setCurrentImageIndex(0);
      setCroppedImages([]);
      setZoom(1);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const processCrop = useCallback(async () => {
    try {
      const croppedImg = await getCroppedImg(uploadedImages[currentImageIndex], croppedAreaPixels, 0);
      setCroppedImages(prev => [...prev, croppedImg]);
      
      if (currentImageIndex < uploadedImages.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      }
    } catch (e) {
      console.error(e);
    }
  }, [uploadedImages, currentImageIndex, croppedAreaPixels]);

  const downloadPDF = () => {
    if (croppedImages.length === 0) return;

    const sizes = {
      'A3': { width: 297, height: 420 },
      'A4': { width: 210, height: 297 },
      '6x4': { width: 101.6, height: 152.4 } 
    };

    const paper = sizes[paperSize];
    
    const actualWidth = paperOrientation === 'landscape' ? Math.max(paper.width, paper.height) : Math.min(paper.width, paper.height);
    const actualHeight = paperOrientation === 'landscape' ? Math.min(paper.width, paper.height) : Math.max(paper.width, paper.height);

    const doc = new jsPDF({
      orientation: paperOrientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: [actualWidth, actualHeight]
    });

    const outerDiameter = 40; 
    const innerDiameter = 30; 
    const margin = 10;
    const spacing = 5;
    const step = outerDiameter + spacing;
    const radius = outerDiameter / 2;
    
    const drawInstance = (cx, cy, img) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.circle(cx, cy, radius);

      const imgX = cx - (innerDiameter / 2);
      const imgY = cy - (innerDiameter / 2);
      doc.addImage(img, 'PNG', imgX, imgY, innerDiameter, innerDiameter);
    };

    const maxCols = Math.floor((actualWidth - 2 * margin + spacing) / step);
    const maxRows = Math.floor((actualHeight - 2 * margin + spacing) / step);
    const perPage = maxCols * maxRows;

    croppedImages.forEach((img, i) => {
      const page = Math.floor(i / perPage);
      const idx = i % perPage;
      
      if (idx === 0 && page > 0) {
        doc.addPage([actualWidth, actualHeight], paperOrientation === 'landscape' ? 'l' : 'p');
      }

      const itemsOnPage = Math.min(croppedImages.length - page * perPage, perPage);
      const r = Math.floor(idx / maxCols);
      const c = idx % maxCols;
      
      let cx, cy;
      
      if (position === 'center') {
        const gridCols = Math.min(itemsOnPage, maxCols);
        const gridRows = Math.ceil(itemsOnPage / maxCols);
        
        const gridW = gridCols * outerDiameter + (gridCols - 1) * spacing;
        const gridH = gridRows * outerDiameter + (gridRows - 1) * spacing;
        
        const startX = (actualWidth - gridW) / 2 + radius;
        const startY = (actualHeight - gridH) / 2 + radius;
        
        cx = startX + c * step;
        cy = startY + r * step;
      } else {
        let dirX = position.includes('right') ? -1 : 1;
        let dirY = position.includes('bottom') ? -1 : 1;
        
        let startX = position.includes('right') ? actualWidth - margin - radius : margin + radius;
        let startY = position.includes('bottom') ? actualHeight - margin - radius : margin + radius;
        
        cx = startX + c * step * dirX;
        cy = startY + r * step * dirY;
      }
      
      drawInstance(cx, cy, img);
    });

    doc.save(`photos_${paperSize}_${paperOrientation}.pdf`);
  };

  const isCroppingFinished = uploadedImages.length > 0 && croppedImages.length === uploadedImages.length;
  const isCroppingActive = uploadedImages.length > 0 && !isCroppingFinished;

  return (
    <div className="app-container">
      <div className="header">
        <h1>Photo Cropper</h1>
        <p>Crop to a 3cm round picture inside a 4cm diameter frame</p>
      </div>

      {uploadedImages.length === 0 ? (
        <div className="upload-box" onClick={() => fileInputRef.current.click()}>
          <Upload className="upload-icon" />
          <h3>Click to upload images</h3>
          <p>Select multiple JPG or PNG files at once</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            multiple
          />
        </div>
      ) : isCroppingActive ? (
        <>
          <div className="crop-header" style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Processing Image {currentImageIndex + 1} of {uploadedImages.length}
          </div>
          <div className="crop-container">
            <Cropper
              image={uploadedImages[currentImageIndex]}
              crop={crop}
              zoom={zoom}
              minZoom={0.1}
              restrictPosition={false}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          <div className="controls">
            <div className="control-group">
              <label>Zoom</label>
              <input
                type="range"
                value={zoom}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => { setUploadedImages([]); setCroppedImages([]); }}>
                Cancel
              </button>
              <button className="btn" onClick={processCrop}>
                {currentImageIndex < uploadedImages.length - 1 ? (
                  <><Crop size={18} /> Crop & Next</>
                ) : (
                  <><Check size={18} /> Crop & Finish</>
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="preview-section">
          <h3>Preview ({croppedImages.length} Ready)</h3>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', margin: '1rem 0' }}>
            {croppedImages.map((img, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <img src={img} alt={`Cropped ${index + 1}`} className="preview-image" style={{ width: '80px', height: '80px' }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Img {index + 1}</div>
              </div>
            ))}
          </div>
          
          <div className="download-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Paper Size</label>
              <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}>
                <option value="6x4">6x4 inches Photo Paper</option>
                <option value="A4">A4 Paper</option>
                <option value="A3">A3 Paper</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Orientation</label>
              <select value={paperOrientation} onChange={(e) => setPaperOrientation(e.target.value)}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Grid Starting Point</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="center">Centered Block</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => { setUploadedImages([]); setCroppedImages([]); }}>
              Start Over
            </button>
            <button className="btn" onClick={downloadPDF}>
              <Download size={18} /> Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


