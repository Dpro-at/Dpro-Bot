'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2, Play, Trash2, Download } from "lucide-react";
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

interface ScanResult {
  id: string;
  target_url: string;
  scan_type: string;
  waf_detected: number;
  waf_type: string | null;
  waf_confidence: number;
  total_payloads: number;
  blocked_count: number;
  passed_count: number;
  bypass_rate: number;
  risk_level: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  results?: {
    detection: any;
    tests: Array<{
      payload: string;
      category: string;
      blocked: boolean;
      status: number | null;
      responseTime: number;
    }>;
  };
}

export default function WafSecurityPage() {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [selfAudit, setSelfAudit] = useState<any>(null);
  const [isLoadingSelfAudit, setIsLoadingSelfAudit] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ext/waf/scans`);
      if (response.ok) {
        const data = await response.json();
        setScans(data.scans || []);
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err);
    }
  };

  const handleScan = async () => {
    if (!url) return;

    setIsScanning(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ext/waf/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode: 'full' }),
      });

      if (response.ok) {
        const { scanId } = await response.json();

        // Poll for results
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > 60) {
            clearInterval(pollInterval);
            setIsScanning(false);
            return;
          }

          const resultResponse = await fetch(`${BACKEND_URL}/api/ext/waf/scan/${scanId}`);
          if (resultResponse.ok) {
            const scan = await resultResponse.json();
            if (scan.status === 'completed' || scan.status === 'failed') {
              clearInterval(pollInterval);
              setSelectedScan(scan);
              fetchScans();
              setIsScanning(false);
            }
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
    }
  };

  const handleSelfAudit = async () => {
    setIsLoadingSelfAudit(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ext/waf/self`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSelfAudit(data);
      }
    } catch (err) {
      console.error('Self-audit failed:', err);
    } finally {
      setIsLoadingSelfAudit(false);
    }
  };

  const handleViewScan = async (scanId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ext/waf/scan/${scanId}`);
      if (response.ok) {
        const scan = await response.json();
        setSelectedScan(scan);
      }
    } catch (err) {
      console.error('Failed to load scan:', err);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    if (!confirm('Delete this scan?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/ext/waf/scans/${scanId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchScans();
        if (selectedScan?.id === scanId) {
          setSelectedScan(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  const getRiskBadge = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'critical':
        return <Badge variant="destructive">CRITICAL</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">HIGH</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">MEDIUM</Badge>;
      case 'low':
        return <Badge className="bg-green-500">LOW</Badge>;
      default:
        return <Badge variant="secondary">UNKNOWN</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">WAF Security Scanner</h2>
        <p className="text-muted-foreground">
          Test web application firewalls and audit security
        </p>
      </div>

      {/* Scan Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Start New Scan
          </CardTitle>
          <CardDescription>
            Enter a URL to test its WAF protection or run a self-audit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isScanning}
            />
            <Button onClick={handleScan} disabled={isScanning || !url}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Scan
                </>
              )}
            </Button>
          </div>
          <Button variant="outline" onClick={handleSelfAudit} disabled={isLoadingSelfAudit}>
            {isLoadingSelfAudit ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Auditing...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Self-Audit Dpro Bot
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Self-Audit Results */}
      {selfAudit && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-600">Self-Audit Results</CardTitle>
            <CardDescription>
              Security issues found in Dpro Bot backend
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selfAudit.totalIssues}</div>
                  <div className="text-sm text-muted-foreground">Total Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{selfAudit.highSeverity}</div>
                  <div className="text-sm text-muted-foreground">High</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{selfAudit.mediumSeverity}</div>
                  <div className="text-sm text-muted-foreground">Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{selfAudit.lowSeverity}</div>
                  <div className="text-sm text-muted-foreground">Low</div>
                </div>
              </div>

              <div className="space-y-2">
                {selfAudit.issues.map((issue: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{issue.type}</span>
                      {getRiskBadge(issue.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.detail}</p>
                    <p className="text-sm text-green-600 mt-1">Fix: {issue.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Scan Results */}
      {selectedScan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scan Results</span>
              {getRiskBadge(selectedScan.risk_level)}
            </CardTitle>
            <CardDescription>{selectedScan.target_url}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WAF Detection */}
            {selectedScan.waf_detected ? (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <Shield className="h-5 w-5 text-red-500" />
                <div>
                  <div className="font-medium text-red-700">WAF Detected: {selectedScan.waf_type}</div>
                  <div className="text-sm text-red-600">Confidence: {selectedScan.waf_confidence}%</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="font-medium text-green-700">No WAF detected (or transparent)</div>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{selectedScan.total_payloads}</div>
                <div className="text-sm text-muted-foreground">Total Payloads</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-500">{selectedScan.blocked_count}</div>
                <div className="text-sm text-muted-foreground">Blocked</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-red-500">{selectedScan.passed_count}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">{selectedScan.bypass_rate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Bypass Rate</div>
              </div>
            </div>

            {/* Test Results by Category */}
            {selectedScan.results && selectedScan.results.tests && (
              <div>
                <h4 className="font-medium mb-2">Test Results</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedScan.results.tests.map((test, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2 border rounded-lg ${
                        test.blocked ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-mono text-sm">{test.payload}</div>
                        <div className="text-xs text-muted-foreground">{test.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.blocked ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant="secondary">{test.status || 'N/A'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>Previous WAF security scans</CardDescription>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scans yet. Start your first scan above.
            </div>
          ) : (
            <div className="space-y-2">
              {scans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{scan.target_url}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(scan.created_at).toLocaleString()} •{' '}
                      {scan.waf_detected ? `${scan.waf_type} detected` : 'No WAF'} •{' '}
                      {scan.bypass_rate.toFixed(1)}% bypass rate
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(scan.risk_level)}
                    <Button variant="ghost" size="sm" onClick={() => handleViewScan(scan.id)}>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteScan(scan.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
