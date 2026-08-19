export async function resizeImage(file: File, maxSize: number = 256): Promise<Blob> {
	return new Promise((resolve, reject) => {
	  const img = new Image();
	  const reader = new FileReader();
  
	  reader.onload = (e) => {
		img.src = e.target?.result as string;
	  };
  
	  img.onload = () => {
		const canvas = document.createElement("canvas");
		canvas.width = maxSize;
		canvas.height = maxSize;
  
		const ctx = canvas.getContext("2d");
		if (!ctx) {
		  reject(new Error("Canvas context not available"));
		  return;
		}
  
		// Center-crop to square before resizing
		const size = Math.min(img.width, img.height);
		const offsetX = (img.width - size) / 2;
		const offsetY = (img.height - size) / 2;
  
		ctx.drawImage(
		  img,
		  offsetX, offsetY, size, size,
		  0, 0, maxSize, maxSize
		);
  
		canvas.toBlob(
		  (blob) => {
			if (blob) resolve(blob);
			else reject(new Error("Canvas export failed"));
		  },
		  "image/jpeg",
		  0.85
		);
	  };
  
	  img.onerror = reject;
	  reader.onerror = reject;
	  reader.readAsDataURL(file);
	});
  }