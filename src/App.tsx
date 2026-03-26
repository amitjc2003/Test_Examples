import React, { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { Chatbot } from './components/Chatbot';
import { parseExcel, calculateMBA, Transaction, Rule } from './utils/mba';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowRight, Info, ShoppingCart, TrendingUp, Link as LinkIcon, RefreshCw, Layers, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  React.useEffect(() => {
    setAiInsight(null);
  }, [selectedProduct]);

  const generateInsight = async () => {
    if (!selectedProduct || productRules.length === 0) return;
    setIsGeneratingInsight(true);
    setAiInsight(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API key is missing. Please configure your Gemini API key.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const topRules = productRules.slice(0, 5).map(r => `${r.consequent} (Confidence: ${(r.confidence * 100).toFixed(1)}%, Lift: ${r.lift.toFixed(2)})`);
      
      const prompt = `You are an expert retail marketer and data analyst. I have conducted a Market Basket Analysis. 
      When customers buy "${selectedProduct}", they frequently also buy:
      ${topRules.join('\n')}
      
      Based on these specific product relationships, conduct a cross-selling opportunity activity. Provide a short, actionable 3-point marketing strategy to cross-sell these products. Keep it concise, practical, and use plain text with standard bullet points (no markdown formatting like ** or ##).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      setAiInsight(response.text || "No insights generated.");
    } catch (err: any) {
      console.error(err);
      setAiInsight("Failed to generate AI insights. Please check your API key or try again.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      // Add a small delay to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const parsedTransactions = await parseExcel(file);
      if (parsedTransactions.length === 0) {
        throw new Error("No valid transactions found. Please check the file format.");
      }
      
      const generatedRules = calculateMBA(parsedTransactions, 0.005); // 0.5% min support
      
      setTransactions(parsedTransactions);
      setRules(generatedRules);
      
      // Try to select 'Fish' by default if it exists, otherwise the most frequent item
      const uniqueItems = Array.from(new Set(parsedTransactions.flatMap(t => t.items)));
      const fishItem = uniqueItems.find(i => i.toLowerCase() === 'fish');
      
      if (fishItem) {
        setSelectedProduct(fishItem);
      } else if (generatedRules.length > 0) {
        setSelectedProduct(generatedRules[0].antecedent);
      } else if (uniqueItems.length > 0) {
        setSelectedProduct(uniqueItems[0]);
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process the file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTransactions([]);
    setRules([]);
    setSelectedProduct('');
    setError(null);
    setAiInsight(null);
  };

  const uniqueProducts = useMemo(() => {
    const products = new Set<string>();
    transactions.forEach(t => t.items.forEach(i => products.add(i)));
    return Array.from(products).sort();
  }, [transactions]);

  const productRules = useMemo(() => {
    if (!selectedProduct) return [];
    return rules
      .filter(r => r.antecedent === selectedProduct)
      .sort((a, b) => b.lift - a.lift); // Sort by Lift descending
  }, [rules, selectedProduct]);

  const chartData = useMemo(() => {
    return productRules.slice(0, 10).map(rule => ({
      name: rule.consequent,
      lift: Number(rule.lift.toFixed(2)),
      confidence: Number((rule.confidence * 100).toFixed(1)),
      coOccurrences: rule.coOccurrences
    }));
  }, [productRules]);

  const topRule = productRules.length > 0 ? productRules[0] : null;

  if (transactions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
        <header className="bg-white border-b border-slate-200 py-6 px-8">
          <div className="max-w-6xl mx-auto flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Market Basket Analyzer</h1>
          </div>
        </header>

        <main className="max-w-6xl mx-auto py-12 px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                Discover Cross-Selling Opportunities
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Upload your transaction data to automatically discover which products are frequently bought together. Perfect for optimizing store layouts, creating product bundles, and targeted marketing campaigns.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center mb-6">
                <Info className="w-5 h-5 mr-2 text-blue-500" />
                Variables & Applications
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-slate-400" />
                    Required Variables
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-6">
                    <li><strong className="text-slate-700">Transaction ID:</strong> Groups items bought in the same order.</li>
                    <li><strong className="text-slate-700">Product Name:</strong> The item being purchased.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-slate-400" />
                    Optional Variables (For Advanced Analysis)
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-6">
                    <li><strong className="text-slate-700">Date/Time:</strong> For seasonal or time-of-day trends.</li>
                    <li><strong className="text-slate-700">Price/Quantity:</strong> To calculate the profitability of cross-selling rules.</li>
                    <li><strong className="text-slate-700">Customer ID:</strong> For personalized recommendations.</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2 text-slate-400" />
                    Key Applications
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-6">
                    <li><strong>Cross-Selling:</strong> "Customers who bought Fish also bought Lemon."</li>
                    <li><strong>Store Layout:</strong> Place highly associated items near each other.</li>
                    <li><strong>Bundling:</strong> Create package deals for frequently co-occurring items.</li>
                    <li><strong>Promotions:</strong> Discount one item to drive sales of its high-margin associate.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 py-4 px-8 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Market Basket Analyzer</h1>
          </div>
          <button 
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Upload New File</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Transactions</p>
              <p className="text-2xl font-bold text-slate-900">{transactions.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Unique Products</p>
              <p className="text-2xl font-bold text-slate-900">{uniqueProducts.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <LinkIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Rules Discovered</p>
              <p className="text-2xl font-bold text-slate-900">{rules.length.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Target Product</h2>
              <p className="text-sm text-slate-500 mb-4">
                Select a product you want to push (e.g., 'Fish') to see what else customers buy with it.
              </p>
              
              <div className="relative">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3 pr-8 font-medium"
                >
                  {uniqueProducts.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                How to read this
              </h3>
              <div className="space-y-4 text-sm text-blue-800">
                <p>
                  <strong>Confidence:</strong> If a customer buys {selectedProduct || 'this'}, there is an X% chance they also buy the associated product.
                </p>
                <p>
                  <strong>Lift:</strong> A Lift &gt; 1 means the products are bought together more often than expected by chance. Higher is better.
                </p>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-2 space-y-8">
            {productRules.length > 0 ? (
              <>
                {/* AI Insights Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-indigo-900 flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
                      AI Cross-Selling Strategy
                    </h2>
                    <button
                      onClick={generateInsight}
                      disabled={isGeneratingInsight}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center cursor-pointer"
                    >
                      {isGeneratingInsight ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> Generate Strategy</>
                      )}
                    </button>
                  </div>
                  
                  {aiInsight ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-indigo-900 leading-relaxed font-medium">
                        {aiInsight}
                      </div>
                    </div>
                  ) : (
                    <p className="text-indigo-700/70 text-sm">
                      Click generate to use AI to analyze these relationships and create a targeted cross-selling campaign.
                    </p>
                  )}
                </div>

                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 mb-6">
                    Top Products bought with <span className="text-blue-600">{selectedProduct}</span>
                  </h2>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          yAxisId="left" 
                          orientation="left" 
                          stroke="#3b82f6" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Confidence (%)', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 12, dy: 50 }}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          stroke="#10b981" 
                          axisLine={false} 
                          tickLine={false}
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Lift', angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 12, dy: -20 }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f1f5f9' }}
                        />
                        <Bar yAxisId="left" dataKey="confidence" name="Confidence (%)" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#3b82f6" />
                          ))}
                        </Bar>
                        <Bar yAxisId="right" dataKey="lift" name="Lift" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#10b981" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chain Visualization */}
                {topRule && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Strongest Buying Chain</h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 py-4">
                      <div className="w-40 px-4 py-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm text-center relative">
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">Target</p>
                        <p className="text-xl font-bold text-slate-800">{topRule.antecedent}</p>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2 text-emerald-500">
                          <div className="hidden sm:block h-0.5 w-8 md:w-16 bg-emerald-200"></div>
                          <ArrowRight className="w-8 h-8" />
                          <div className="hidden sm:block h-0.5 w-8 md:w-16 bg-emerald-200"></div>
                        </div>
                        <div className="mt-2 text-center bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                          <p className="text-xs font-bold text-emerald-700">
                            {(topRule.confidence * 100).toFixed(1)}% Buy Together
                          </p>
                        </div>
                      </div>

                      <div className="w-40 px-4 py-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm text-center relative">
                        <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Most Bought With</p>
                        <p className="text-xl font-bold text-slate-800">{topRule.consequent}</p>
                      </div>
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-6">
                      When customers buy <strong className="text-slate-700">{topRule.antecedent}</strong>, the product they are most likely to add to their basket is <strong className="text-slate-700">{topRule.consequent}</strong>.
                    </p>
                  </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900">Detailed Relationships</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Rule
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Co-occurrences
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Lift
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {productRules.map((rule, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm">
                                <span className="font-medium text-slate-900">{rule.antecedent}</span>
                                <ArrowRight className="w-4 h-4 mx-2 text-slate-400" />
                                <span className="font-medium text-blue-600">{rule.consequent}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                              {rule.coOccurrences}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-600">
                              {(rule.confidence * 100).toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
                                rule.lift > 1.5 ? 'bg-emerald-100 text-emerald-800' : 
                                rule.lift > 1 ? 'bg-blue-100 text-blue-800' : 
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {rule.lift.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No strong relationships found</h3>
                <p className="text-slate-500">
                  We couldn't find any products frequently bought with "{selectedProduct}". 
                  Try selecting a different product or lowering the minimum support threshold in the code.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Chatbot rules={rules} totalTransactions={transactions.length} />
    </div>
  );
}
