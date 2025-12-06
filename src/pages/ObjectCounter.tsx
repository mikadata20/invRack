import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tmImage from "@teachablemachine/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Camera, StopCircle, RefreshCw, Layers, Check, Save, ExternalLink, Box, HelpCircle, BookOpen, Upload, FileText, Link, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ObjectCounter = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Model State
    const [modelSource, setModelSource] = useState<"general" | "custom">("general");
    const [customSourceType, setCustomSourceType] = useState<"url" | "file" | "part" | "cloud_upload">("url");
    const [cocoModel, setCocoModel] = useState<cocoSsd.ObjectDetection | null>(null);
    const [customModel, setCustomModel] = useState<tmImage.CustomMobileNet | null>(null);
    const [customModelUrl, setCustomModelUrl] = useState("");

    // File Upload State
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [weightsFile, setWeightsFile] = useState<File | null>(null);
    const [metadataFile, setMetadataFile] = useState<File | null>(null);

    // Part Linking State
    const [partSearchQuery, setPartSearchQuery] = useState("");
    const [partSearchResults, setPartSearchResults] = useState<any[]>([]);
    const [linkedPart, setLinkedPart] = useState<any>(null);

    // Model Management State
    const [savedModels, setSavedModels] = useState<any[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>("");
    const [newModelName, setNewModelName] = useState("");
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);

    // Operation State
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [counts, setCounts] = useState<{ [key: string]: number }>({});
    const [currentPrediction, setCurrentPrediction] = useState<{ className: string; probability: number } | null>(null);
    const [manualQty, setManualQty] = useState(1);
    const [transactionMode, setTransactionMode] = useState<"SUPPLY" | "PICKING" | "KOBETSU">("SUPPLY");
    const requestRef = useRef<number>();

    // Inventory Update State
    const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
    const [targetPartNo, setTargetPartNo] = useState(""); // For the manual update dialog
    const [updateSearchResults, setUpdateSearchResults] = useState<any[]>([]); // For the manual update dialog
    const [selectedUpdatePart, setSelectedUpdatePart] = useState<any>(null); // For the manual update dialog

    // Initial Load
    useEffect(() => {
        fetchSavedModels();
        if (modelSource === 'general' && !cocoModel) {
            loadCocoModel();
        }
    }, [modelSource]);

    const fetchSavedModels = async () => {
        const { data, error } = await supabase.from('ai_models').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching models:', error);
        } else {
            setSavedModels(data || []);
        }
    };

    const loadCocoModel = async () => {
        try {
            setIsLoading(true);
            await tf.ready();
            const loadedModel = await cocoSsd.load({
                base: "lite_mobilenet_v2"
            });
            setCocoModel(loadedModel);
            toast({ title: "General Model Loaded", description: "COCO-SSD is ready." });
        } catch (error) {
            console.error("Failed to load COCO model", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load General Model." });
        } finally {
            setIsLoading(false);
        }
    };

    const loadCustomModelFromUrl = async (urlOverride?: string) => {
        const urlToLoad = urlOverride || customModelUrl;

        if (!urlToLoad) {
            toast({ variant: "destructive", title: "Error", description: "Please enter or select a Model URL" });
            return;
        }

        // Ensure URL ends with slash
        const url = urlToLoad.endsWith("/") ? urlToLoad : urlToLoad + "/";
        const modelURL = url + "model.json";
        const metadataURL = url + "metadata.json";

        try {
            setIsLoading(true);
            const loadedModel = await tmImage.load(modelURL, metadataURL);
            setCustomModel(loadedModel);
            toast({ title: "Custom Model Loaded", description: "Teachable Machine model is ready." });
        } catch (error) {
            console.error("Failed to load custom model", error);
            toast({ variant: "destructive", title: "Load Error", description: "Could not load model. Check URL." });
            if (error instanceof Error && error.message.includes("404")) {
                toast({ description: "Tip: Make sure to copy the full URL including 'https://' from Teachable Machine." });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadCustomModelFromFiles = async () => {
        if (!jsonFile || !weightsFile || !metadataFile) {
            toast({ variant: "destructive", title: "Error", description: "Please select all 3 files (model.json, weights.bin, metadata.json)" });
            return;
        }

        try {
            setIsLoading(true);
            // Type assertion as the library expects generic Files
            const loadedModel = await tmImage.loadFromFiles(jsonFile, weightsFile, metadataFile);
            setCustomModel(loadedModel);
            toast({ title: "Offline Model Loaded", description: "Model loaded from files successfully." });
        } catch (error) {
            console.error("Failed to load model from files", error);
            toast({ variant: "destructive", title: "Load Error", description: "Could not load from files. Ensure they are correct." });
        } finally {
            setIsLoading(false);
        }
    };

    // Model Persistence (Supabase & Browser)
    const handleSaveModelToDb = async () => {
        if (!newModelName || !customModelUrl) {
            toast({ variant: "destructive", title: "Error", description: "Name and URL required" });
            return;
        }

        const { error } = await supabase.from('ai_models').insert({
            name: newModelName,
            url: customModelUrl,
            description: "Saved from Smart Counter"
        });

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Success", description: "Model saved to Database" });
            setIsSaveDialogOpen(false);
            setNewModelName("");
            fetchSavedModels();
        }
    };

    const handleSaveModelToBrowser = async () => {
        if (!newModelName || !customModel) {
            toast({ variant: "destructive", title: "Error", description: "No model loaded to save, or name missing." });
            return;
        }

        try {
            // Save the underlying tfjs model to IndexedDB
            await customModel.model.save('indexeddb://' + newModelName);

            // Save metadata to localStorage
            const metadata = customModel.getMetadata();
            localStorage.setItem('teachable_metadata_' + newModelName, JSON.stringify(metadata));

            toast({ title: "Success", description: `Model '${newModelName}' saved to Browser Storage. Link using local://${newModelName}` });
            setIsSaveDialogOpen(false);
            setNewModelName("");
        } catch (error: any) {
            console.error("Save to browser error:", error);
            toast({ variant: "destructive", title: "Save Error", description: error.message || "Failed to save to browser" });
        }
    };

    const loadCustomModelFromBrowser = async (modelName: string) => {
        try {
            setIsLoading(true);

            // Checks if model exists in IndexedDB
            // There isn't a direct "exists" check in simple tfjs API without listing, 
            // but loadLayersModel will fail if not found.

            // Load metadata first
            const metadataStr = localStorage.getItem('teachable_metadata_' + modelName);
            if (!metadataStr) throw new Error("Metadata not found in local storage");
            const metadata = JSON.parse(metadataStr);

            // Load model
            const model = await tf.loadLayersModel('indexeddb://' + modelName);

            // Reconstruct CustomMobileNet (Teachable Machine wrapper)
            // tmImage.CustomMobileNet(model, metadata) - constructor isn't directly exposed usually, 
            // but we can use loadFromFiles logic or similar workaround if needed.
            // Actually, tmImage has `load` which expects URLs. 
            // We can manually construct the object if we have the internal model.

            // Workaround: tmImage doesn't officially support loading from IndexedDB directly via its API.
            // We need to instantiate CustomMobileNet. 
            // Looking at tmImage source, it wraps `tf.Model`.

            // Let's rely on the fact that we can create a new object.
            // @ts-ignore - access internal constructor or factory if possible, 
            // OR use a modified version of tmImage. 
            // Simpler approach: We can use the loaded tf.model and run predict manually, 
            // BUT we want to keep using `customModel.predict` for consistency.

            // Official TM library doesn't strictly support this. 
            // Hack: Create a dummy CustomMobileNet and swap its model?
            // Or better: Use `tmImage.load` but intercept fetch? Too complex.

            // Let's try to simulate what `load` does. 
            // It returns `new CustomMobileNet(model, metadata)`. 
            // We can cast `any` to bypass TS restriction if the class is exported but not in types.
            const customMobileNet = new tmImage.CustomMobileNet(model, metadata);
            setCustomModel(customMobileNet);

            toast({ title: "Offline Model Loaded", description: `Loaded '${modelName}' from browser storage.` });
            setCustomSourceType("file"); // Set to file/offline mode visually
        } catch (error: any) {
            console.error("Load from browser error", error);
            toast({ variant: "destructive", title: "Load Error", description: `Could not load 'local://${modelName}'. Save it to browser first.` });
        } finally {
            setIsLoading(false);
        }
    };

    // Router for loading
    const loadModelGeneric = (path: string) => {
        if (path.startsWith("local://")) {
            const name = path.replace("local://", "");
            loadCustomModelFromBrowser(name);
        } else {
            loadCustomModelFromUrl(path);
        }
    };

    const handleModelSelect = (id: string) => {
        setSelectedModelId(id);
        const model = savedModels.find(m => m.id.toString() === id);
        if (model) {
            setCustomModelUrl(model.url);
            setCustomSourceType("url");
            loadModelGeneric(model.url);
        }
    };

    // Part Linking Logic
    const searchPartForLinking = async () => {
        if (!partSearchQuery) return;
        const { data, error } = await supabase
            .from('bom_master')
            .select('*')
            .or(`unix_no.ilike.%${partSearchQuery}%,model.ilike.%${partSearchQuery}%`);

        if (error) {
            toast({ variant: "destructive", title: "Search Error", description: error.message });
        } else {
            setPartSearchResults(data || []);
        }
    };

    const handleSelectPartForLinking = (part: any) => {
        setLinkedPart(part);
        if (part.default_model_url) {
            setCustomModelUrl(part.default_model_url);
            loadCustomModelFromUrl(part.default_model_url);
            // Also pre-fill the stock update selection
            // We map BOM data to what the update dialog expects
            setSelectedUpdatePart({
                id: part.id,
                part_no: part.unix_no, // Mapping unix_no to part_no for compatibility
                part_name: part.part_name,
                rack_location: part.location || part.rack || "Unknown",
            });
        } else {
            toast({ variant: "warning", title: "No Model Found", description: `Part ${part.unix_no} does not have a linked AI Model.` });
        }
    };

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false,
                });
                if (videoRef.current) {
                    // Ensure video plays inline for mobile
                    videoRef.current.setAttribute("playsinline", "true");
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current!.play();
                        setIsStreaming(true);
                        if (modelSource === 'general') {
                            detectFrameCoco();
                        } else {
                            detectFrameCustom();
                        }
                    };
                }
            } catch (error) {
                console.error("Error accessing camera", error);
                toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera." });
            }
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
            setIsStreaming(false);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }
    };

    const handleUploadToCloud = async () => {
        if (!jsonFile || !weightsFile || !metadataFile || !newModelName) {
            toast({ variant: "destructive", title: "Error", description: "All files and name required" });
            return;
        }

        try {
            setIsLoading(true);
            const timestamp = new Date().getTime();
            const folderPath = `${timestamp}-${newModelName.replace(/\s+/g, '-')}`;

            // Upload files
            const files = [
                { name: 'model.json', file: jsonFile },
                { name: 'weights.bin', file: weightsFile },
                { name: 'metadata.json', file: metadataFile }
            ];

            for (const item of files) {
                const { error } = await supabase.storage
                    .from('models')
                    .upload(`${folderPath}/${item.name}`, item.file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) throw error;
            }

            // Construct Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('models')
                .getPublicUrl(`${folderPath}/`);

            // The publicUrl usually points to the file, but we want the base folder + model.json logic for TM
            // TM loads [url]model.json. 
            // Supabase Public URL for folder might need adjustment.
            // Let's us get the URL for model.json and strip the filename

            const modelJsonUrl = supabase.storage.from('models').getPublicUrl(`${folderPath}/model.json`).data.publicUrl;
            const baseUrl = modelJsonUrl.replace('model.json', ''); // Ensure trailing slash

            // Save to DB
            const { error: dbError } = await supabase.from('ai_models').insert({
                name: newModelName,
                url: baseUrl,
                description: "Uploaded to Supabase Storage"
            });

            if (dbError) throw dbError;

            toast({ title: "Success", description: "Model uploaded and saved to cloud!" });
            setCustomSourceType("url");
            setCustomModelUrl(baseUrl);
            fetchSavedModels();
            setNewModelName("");

        } catch (error: any) {
            console.error("Upload error:", error);
            toast({ variant: "destructive", title: "Upload Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // COCO-SSD Loop
    const detectFrameCoco = async () => {
        if (!cocoModel || !videoRef.current || !canvasRef.current || !isStreaming || modelSource !== 'general') return;

        if (videoRef.current.readyState === 4) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");

            if (!ctx) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const predictions = await cocoModel.detect(video);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const currentCounts: { [key: string]: number } = {};

            predictions.forEach((prediction) => {
                const [x, y, width, height] = prediction.bbox;
                const text = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;

                ctx.strokeStyle = "#00FF00";
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);

                ctx.fillStyle = "#00FF00";
                const textWidth = ctx.measureText(text).width;
                ctx.fillRect(x, y > 10 ? y - 15 : y, textWidth + 10, 15);

                ctx.fillStyle = "#000000";
                ctx.font = "12px Arial";
                ctx.fillText(text, x, y > 10 ? y - 4 : y + 10);

                currentCounts[prediction.class] = (currentCounts[prediction.class] || 0) + 1;
            });

            setCounts(currentCounts);
            requestRef.current = requestAnimationFrame(detectFrameCoco);
        } else {
            requestRef.current = requestAnimationFrame(detectFrameCoco);
        }
    };

    // Custom Model Loop
    const detectFrameCustom = async () => {
        if (!customModel || !videoRef.current || !isStreaming || modelSource !== 'custom') return;

        if (videoRef.current.readyState === 4) {
            const prediction = await customModel.predict(videoRef.current);

            let highestProb = 0;
            let bestClass = "";

            prediction.forEach(p => {
                if (p.probability > highestProb) {
                    highestProb = p.probability;
                    bestClass = p.className;
                }
            });

            if (highestProb > 0.8) {
                setCurrentPrediction({ className: bestClass, probability: highestProb });
            } else {
                setCurrentPrediction(null);
            }

            requestRef.current = requestAnimationFrame(detectFrameCustom);
        } else {
            requestRef.current = requestAnimationFrame(detectFrameCustom);
        }
    };

    const handleCountCustom = () => {
        if (currentPrediction) {
            setCounts(prev => ({
                ...prev,
                [currentPrediction.className]: (prev[currentPrediction.className] || 0) + manualQty
            }));
            toast({ title: "Counted", description: `+${manualQty} ${currentPrediction.className}` });
        }
    };

    // Inventory Search for Stock Update Dialog
    const searchPartForUpdate = async () => {
        if (!targetPartNo) return;
        const { data, error } = await supabase
            .from('partner_rack')
            .select('*')
            .ilike('part_no', `%${targetPartNo}%`);

        if (error) {
            toast({ variant: "destructive", title: "Search Error", description: error.message });
        } else {
            setUpdateSearchResults(data || []);
        }
    };

    const handleUpdateStock = async () => {
        const part = selectedUpdatePart;

        if (!part) {
            toast({ variant: "destructive", title: "Error", description: "No part selected" });
            return;
        }

        const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

        if (totalCount === 0) {
            toast({ variant: "destructive", title: "Error", description: "No items counted yet" });
            return;
        }

        try {
            const { data: user } = await supabase.auth.getUser();

            const { data: existingInv } = await supabase
                .from("rack_inventory")
                .select("*")
                .eq("part_no", part.part_no)
                .eq("rack_location", part.rack_location)
                .maybeSingle();

            const oldStock = existingInv?.qty || 0;

            // Logic for Add/Subtract
            let newStock = oldStock;
            if (transactionMode === "SUPPLY") {
                newStock = oldStock + totalCount;
            } else { // PICKING or KOBETSU
                newStock = oldStock - totalCount;
                if (newStock < 0) {
                    toast({ variant: "destructive", title: "Stock Error", description: `Cannot pick ${totalCount}. Current stock: ${oldStock}` });
                    return;
                }
            }

            const now = new Date().toISOString();

            if (existingInv) {
                await supabase.from("rack_inventory").update({
                    qty: newStock,
                    last_supply: transactionMode === "SUPPLY" ? now : existingInv.last_supply,
                } as any).eq("id", existingInv.id);
            } else {
                if (transactionMode !== "SUPPLY") {
                    toast({ variant: "destructive", title: "Error", description: "Cannot pick from empty inventory" });
                    return;
                }
                await supabase.from("rack_inventory").insert({
                    part_no: part.part_no,
                    part_name: part.part_name,
                    rack_location: part.rack_location,
                    qty: totalCount,
                    last_supply: now,
                    max_capacity: 100,
                } as any);
            }

            // Log Transaction
            await supabase.from("transaction_log").insert({
                process_type: `SMART_${transactionMode}`, // SMART_SUPPLY, SMART_PICKING, SMART_KOBETSU
                part_no: part.part_no,
                rack_location: part.rack_location,
                qty: totalCount,
                start_time: now,
                end_time: now,
                duration_sec: 0,
                user_id: user.user?.id || null,
            } as any);

            // Log Stock Transaction (Unified Ledger)
            await supabase.from("stock_transactions").insert({
                transaction_id: `SMART-${Date.now()}`,
                transaction_type: transactionMode,
                item_code: part.part_no,
                item_name: part.part_name,
                qty: totalCount,
                rack_location: part.rack_location,
                user_id: user.user?.id || null,
                username: user.user?.email || "SmartCounter",
            } as any);

            await supabase.from("transaction_log").insert({
                process_type: "SMART_COUNT",
                part_no: part.part_no,
                rack_location: part.rack_location,
                qty: totalCount,
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString(),
                duration_sec: 0,
                user_id: user.user?.id || null,
            } as any);

            toast({ title: "Success", description: `Updated Stock for ${part.part_no}: +${totalCount}` });
            setIsStockDialogOpen(false);
            setCounts({});
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                    </Button>
                    <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <HelpCircle className="h-4 w-4 text-primary" /> Help & Guide
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                    Smart Counter User Guide
                                </DialogTitle>
                                <DialogDescription>
                                    How to train, load, and use custom object detection models.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[60vh] pr-4">
                                <div className="space-y-6 text-sm">
                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                            Train (Teachable Machine)
                                        </h3>
                                        <div className="bg-muted p-3 rounded-md space-y-2">
                                            <p>Create a model for your parts (e.g., differentiating M6 vs M8 bolts).</p>
                                            <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground">
                                                <li>Create Class 1: <b>"Bolt M6"</b> (Take 30+ photos)</li>
                                                <li>Create Class 2: <b>"Bolt M8"</b> (Take 30+ photos)</li>
                                                <li>Click <b>Train Model</b>.</li>
                                                <li>Test it with the webcam.</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                            Save & Use Model
                                        </h3>
                                        <div className="bg-muted p-3 rounded-md space-y-3">
                                            <div>
                                                <p className="font-semibold text-primary">Option A: Online (Cloud)</p>
                                                <p className="text-xs text-muted-foreground">Best for multi-device access.</p>
                                                <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground text-xs">
                                                    <li>Click "Export Model" &rarr; "Upload my model" on Teachable Machine.</li>
                                                    <li>Copy URL: <code>https://teachablemachine.withgoogle.com...</code></li>
                                                    <li>Paste into <b>Default Model URL</b> in BOM Master.</li>
                                                </ul>
                                            </div>
                                            <div className="border-t pt-2">
                                                <p className="font-semibold text-primary">Option B: Offline (Browser Storage)</p>
                                                <p className="text-xs text-muted-foreground">No internet required. Single device.</p>
                                                <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground text-xs">
                                                    <li>Download model files from Teachable Machine (Javascript).</li>
                                                    <li>In this app, go to <b>Offline File</b> tab &rarr; Load the 3 files.</li>
                                                    <li>Click <b>Save URL</b> (disk icon) &rarr; <b>Save to Browser</b>.</li>
                                                    <li>Name it e.g., <code>bolt-model</code>.</li>
                                                    <li>In BOM Master, use URL: <code>local://bolt-model</code>.</li>
                                                </ul>
                                            </div>
                                            <div className="border-t pt-2">
                                                <p className="font-semibold text-primary">Option C: Upload to App Cloud</p>
                                                <p className="text-xs text-muted-foreground">Upload files here to access on any device.</p>
                                                <ul className="list-disc list-inside space-y-1 ml-1 text-muted-foreground text-xs">
                                                    <li>Go to <b>Upload</b> tab &rarr; Select files &rarr; Upload.</li>
                                                    <li>The app generates a cloud URL automatically.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                            Link to Master Data (BOM)
                                        </h3>
                                        <div className="bg-muted p-3 rounded-md space-y-2">
                                            <p>Automate model loading by linking parts.</p>
                                            <div className="text-xs border p-2 rounded bg-background font-mono space-y-1">
                                                <p><b>Example Setup:</b></p>
                                                <p>Part No: <code>UNIX-123</code></p>
                                                <p>Model URL: <code>local://bolt-model</code></p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Now, when you select <b>Load by Part</b> and search "UNIX-123", the "bolt-model" will execute instantly without internet.
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-3 rounded-lg">
                                <Layers className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Smart Object Counter</CardTitle>
                                <CardDescription>
                                    AI-powered object counting with Inventory Integration.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Tabs value={modelSource} onValueChange={(v) => { stopCamera(); setModelSource(v as any); }}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="general">General (COCO-SSD)</TabsTrigger>
                                <TabsTrigger value="custom">Custom (Teachable Machine)</TabsTrigger>
                            </TabsList>

                            <TabsContent value="custom" className="space-y-4 mt-4">
                                <div className="space-y-4 border p-4 rounded-lg bg-background">

                                    {/* Source Type Toggle */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div
                                            className={`cursor-pointer px-2 py-2 rounded-md border text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 text-center transition-colors ${customSourceType === 'url' ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-background hover:bg-muted'}`}
                                            onClick={() => setCustomSourceType("url")}
                                        >
                                            <ExternalLink className="h-4 w-4" /> By URL
                                        </div>
                                        <div
                                            className={`cursor-pointer px-2 py-2 rounded-md border text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 text-center transition-colors ${customSourceType === 'part' ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-background hover:bg-muted'}`}
                                            onClick={() => setCustomSourceType("part")}
                                        >
                                            <Link className="h-4 w-4" /> By Part
                                        </div>
                                        <div
                                            className={`cursor-pointer px-2 py-2 rounded-md border text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 text-center transition-colors ${customSourceType === 'file' ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-background hover:bg-muted'}`}
                                            onClick={() => setCustomSourceType("file")}
                                        >
                                            <FileText className="h-4 w-4" /> Offline File
                                        </div>
                                    </div>

                                    {/* MODE: URL */}
                                    {customSourceType === 'url' && (
                                        <>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1 space-y-2">
                                                    <Label>Select Saved Model</Label>
                                                    <Select value={selectedModelId} onValueChange={handleModelSelect}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a model..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {savedModels.map((m) => (
                                                                <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-background px-2 text-muted-foreground">Or load from URL</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Teachable Machine Model URL</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="https://teachablemachine.withgoogle.com/models/..."
                                                        value={customModelUrl}
                                                        onChange={(e) => setCustomModelUrl(e.target.value)}
                                                    />
                                                    <Button onClick={() => loadCustomModelFromUrl()} disabled={isLoading}>
                                                        Load
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-sm">
                                                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            <Save className="h-3 w-3" /> Save URL
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Save AI Model</DialogTitle>
                                                            <DialogDescription>Save this model for quick access.</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Model Name</Label>
                                                                <Input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="e.g. Bolt-A" />
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <Button onClick={handleSaveModelToDb} variant="secondary">Save URL to Database</Button>
                                                                <Button onClick={handleSaveModelToBrowser} disabled={!customModel}>
                                                                    Save Current Model to Browser (Offline)
                                                                </Button>
                                                                <p className="text-[10px] text-muted-foreground text-center">
                                                                    "Save to Browser" saves the currently loaded model files to this device's memory.
                                                                    Link in BOM using <code>local://ModelName</code>.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </>
                                    )}

                                    {/* MODE: PART */}
                                    {customSourceType === 'part' && (
                                        <div className="space-y-4 animate-in fade-in-50">
                                            <div className="space-y-2">
                                                <Label>Search Part Number</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Enter Part No..."
                                                        value={partSearchQuery}
                                                        onChange={(e) => setPartSearchQuery(e.target.value)}
                                                    />
                                                    <Button variant="secondary" onClick={searchPartForLinking}><Search className="h-4 w-4" /></Button>
                                                </div>
                                            </div>

                                            {partSearchResults.length > 0 && (
                                                <div className="space-y-2 max-h-[150px] overflow-y-auto border rounded p-2">
                                                    {partSearchResults.map(part => (
                                                        <div
                                                            key={part.id}
                                                            className={`p-2 rounded border cursor-pointer hover:bg-accent flex justify-between items-center ${linkedPart?.id === part.id ? 'bg-accent border-primary' : ''}`}
                                                            onClick={() => handleSelectPartForLinking(part)}
                                                        >
                                                            <div>
                                                                <p className="font-bold text-sm">{part.unix_no} / {part.model}</p>
                                                                <p className="text-xs text-muted-foreground">{part.part_name}</p>
                                                            </div>
                                                            {part.default_model_url ? (
                                                                <div className="flex items-center text-green-600 text-xs gap-1">
                                                                    <Link className="h-3 w-3" /> Linked
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">No Model</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* MODE: FILE */}
                                    {customSourceType === 'file' && (
                                        <div className="space-y-4 animate-in fade-in-50">
                                            <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-xs border border-yellow-200">
                                                Select the 3 extracted files (model.json, weights.bin, metadata.json).
                                            </div>

                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label>1. model.json</Label>
                                                    <Input type="file" accept=".json" onChange={e => setJsonFile(e.target.files?.[0] || null)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>2. weights.bin</Label>
                                                    <Input type="file" accept=".bin" onChange={e => setWeightsFile(e.target.files?.[0] || null)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>3. metadata.json</Label>
                                                    <Input type="file" accept=".json" onChange={e => setMetadataFile(e.target.files?.[0] || null)} />
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full"
                                                onClick={loadCustomModelFromFiles}
                                                disabled={!jsonFile || !weightsFile || !metadataFile || isLoading}
                                            >
                                                {isLoading ? "Loading..." : "Load from Files (Offline)"}
                                            </Button>
                                        </div>
                                    )}

                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Controls */}
                        <div className="flex gap-2 justify-center py-4">
                            {!isStreaming ? (
                                <Button
                                    onClick={startCamera}
                                    size="lg"
                                    className="w-full sm:w-auto"
                                    disabled={isLoading || (modelSource === 'custom' && !customModel) || (modelSource === 'general' && !cocoModel)}
                                >
                                    <Camera className="mr-2 h-4 w-4" /> Start Camera
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={stopCamera} size="lg" className="w-full sm:w-auto">
                                    <StopCircle className="mr-2 h-4 w-4" /> Stop Camera
                                </Button>
                            )}
                            <Button variant="outline" size="lg" onClick={() => setCounts({})}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Reset
                            </Button>
                        </div>

                        {/* Video Feed */}
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border shadow-inner">
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />

                            {/* Canvas for COCO */}
                            {modelSource === 'general' && (
                                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                            )}

                            {/* Overlay for Custom */}
                            {modelSource === 'custom' && isStreaming && currentPrediction && (
                                <div className="absolute top-4 left-4 right-4 flex justify-center">
                                    <div className="bg-black/70 text-white px-6 py-2 rounded-full backdrop-blur-md flex items-center gap-3 border border-white/20">
                                        <span className="text-xl font-bold">{currentPrediction.className}</span>
                                        <div className="w-px h-6 bg-white/20" />
                                        <span className={`text-sm font-medium ${currentPrediction.probability > 0.9 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {Math.round(currentPrediction.probability * 100)}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom Model Count Controls */}
                        {modelSource === 'custom' && isStreaming && (
                            <div className="space-y-2 mt-4">
                                <div className="flex gap-2">
                                    <div className="bg-white rounded-md flex items-center border shadow-sm w-32">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-full px-2 hover:bg-muted"
                                            onClick={() => setManualQty(Math.max(1, manualQty - 1))}
                                        >
                                            -
                                        </Button>
                                        <Input
                                            type="number"
                                            value={manualQty}
                                            onChange={e => setManualQty(Number(e.target.value))}
                                            className="border-0 text-center h-full focus-visible:ring-0 text-lg font-bold"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-full px-2 hover:bg-muted"
                                            onClick={() => setManualQty(manualQty + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                    <Button
                                        size="lg"
                                        className={`flex-1 h-14 text-lg transition-all ${currentPrediction ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
                                        onClick={handleCountCustom}
                                        disabled={!currentPrediction}
                                    >
                                        <Check className="mr-2 h-6 w-6" />
                                        {currentPrediction ? `Add ${manualQty} ${currentPrediction.className}` : "Waiting..."}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    AI detects type, you verify quantity.
                                </p>
                            </div>
                        )}

                        {/* Counts & Actions */}
                        {(Object.keys(counts).length > 0) && (
                            <div className="bg-muted/50 p-4 rounded-lg border space-y-4 animate-in fade-in-50 mt-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-lg">Current Session</h3>
                                    <Dialog open={isStockDialogOpen} onOpenChange={(v) => { if (v && linkedPart) setSelectedUpdatePart(linkedPart); setIsStockDialogOpen(v); }}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="gap-2">
                                                <Box className="h-4 w-4" /> Update Stock
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Update Inventory Stock</DialogTitle>
                                                <DialogDescription>
                                                    Select the Part and Transaction Type for <b>{Object.values(counts).reduce((a, b) => a + b, 0)}</b> items.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4 py-4">
                                                {/* Transaction Type Selector */}
                                                <div className="space-y-2">
                                                    <Label>Transaction Type</Label>
                                                    <RadioGroup
                                                        defaultValue="SUPPLY"
                                                        value={transactionMode}
                                                        onValueChange={(v: "SUPPLY" | "PICKING" | "KOBETSU") => setTransactionMode(v)}
                                                        className="grid grid-cols-3 gap-2"
                                                    >
                                                        <div className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer hover:bg-accent has-[:checked]:bg-green-50 has-[:checked]:border-green-500">
                                                            <RadioGroupItem value="SUPPLY" id="mode-supply" />
                                                            <Label htmlFor="mode-supply" className="cursor-pointer">Supply (In)</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer hover:bg-accent has-[:checked]:bg-red-50 has-[:checked]:border-red-500">
                                                            <RadioGroupItem value="PICKING" id="mode-picking" />
                                                            <Label htmlFor="mode-picking" className="cursor-pointer">Picking (Out)</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer hover:bg-accent has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
                                                            <RadioGroupItem value="KOBETSU" id="mode-kobetsu" />
                                                            <Label htmlFor="mode-kobetsu" className="cursor-pointer">Kobetsu</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Search Part No..."
                                                        value={targetPartNo}
                                                        onChange={(e) => setTargetPartNo(e.target.value)}
                                                    />
                                                    <Button variant="secondary" onClick={searchPartForUpdate}>Search</Button>
                                                </div>

                                                <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                                                    {updateSearchResults.map(part => (
                                                        <div
                                                            key={part.id}
                                                            className={`p-2 rounded border cursor-pointer hover:bg-accent flex justify-between items-center ${selectedUpdatePart?.id === part.id ? 'bg-accent border-primary' : ''}`}
                                                            onClick={() => setSelectedUpdatePart(part)}
                                                        >
                                                            <div>
                                                                <p className="font-bold text-sm">{part.part_no}</p>
                                                                <p className="text-xs text-muted-foreground">{part.part_name} - {part.rack_location}</p>
                                                            </div>
                                                            {selectedUpdatePart?.id === part.id && <Check className="h-4 w-4 text-primary" />}
                                                        </div>
                                                    ))}
                                                    {selectedUpdatePart && !updateSearchResults.find(p => p.id === selectedUpdatePart.id) && (
                                                        <div className="p-2 rounded border bg-accent border-primary flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-sm">{selectedUpdatePart.part_no}</p>
                                                                <p className="text-xs text-muted-foreground">{selectedUpdatePart.part_name} - {selectedUpdatePart.rack_location}</p>
                                                            </div>
                                                            <Check className="h-4 w-4 text-primary" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <DialogFooter>
                                                <Button
                                                    onClick={handleUpdateStock}
                                                    disabled={!selectedUpdatePart}
                                                    variant={transactionMode === "SUPPLY" ? "default" : "destructive"}
                                                >
                                                    Confirm {transactionMode}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.entries(counts).map(([name, count]) => (
                                        <div key={name} className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm">
                                            <span className="capitalize font-medium truncate mr-2">{name}</span>
                                            <span className="font-bold text-lg bg-primary/10 px-2 rounded">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ObjectCounter;
