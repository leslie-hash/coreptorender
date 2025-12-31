import React, { useState, useEffect } from 'react';
import { Search, Filter, Save, X, Calendar, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';

interface SearchResult {
  type: 'team_member' | 'leave_request';
  id: string;
  title: string;
  subtitle: string;
  metadata: Record<string, string | number | boolean | unknown>;
  relevance: number;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: SearchFilters;
}

interface SearchFilters {
  query: string;
  department: string;
  status: string;
  leaveType: string;
  dateFrom: string;
  dateTo: string;
  searchIn: 'all' | 'team_members' | 'leave_requests';
}

interface GlobalSearchProps {
  initialQuery?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ initialQuery = '' }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    department: 'all',
    status: 'all',
    leaveType: 'all',
    dateFrom: '',
    dateTo: '',
    searchIn: 'all'
  });

  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    loadPresets();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2 || filters.department !== 'all' || filters.status !== 'all') {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, filters]);

  const loadPresets = () => {
    const saved = localStorage.getItem('searchPresets');
    if (saved) {
      setPresets(JSON.parse(saved));
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: { ...filters, query: searchQuery }
    };
    
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('searchPresets', JSON.stringify(updated));
    setPresetName('');
    alert('Filter preset saved!');
  };

  const loadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setSearchQuery(preset.filters.query);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('searchPresets', JSON.stringify(updated));
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/team-members', {
        credentials: 'include',
      });
      if (response.ok) {
        const members: Array<{ department?: string; [key: string]: unknown }> = await response.json();
        const uniqueDepts = Array.from(new Set(members.map((m) => m.department || 'N/A')));
        setDepartments(uniqueDepts as string[]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const [teamResponse, leaveResponse] = await Promise.all([
        fetch('/api/team-members', { credentials: 'include' }),
        fetch('/api/leave-requests?limit=1000', { credentials: 'include' })
      ]);

      const searchResults: SearchResult[] = [];

      // Search team members
      if (filters.searchIn === 'all' || filters.searchIn === 'team_members') {
        if (teamResponse.ok) {
          const members: Array<{ name: string; email: string; department?: string; [key: string]: unknown }> = await teamResponse.json();
          const filteredMembers = members.filter((member) => {
            const matchesQuery = searchQuery.length === 0 || 
              member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (member.department && member.department.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesDept = filters.department === 'all' || member.department === filters.department;
            
            return matchesQuery && matchesDept;
          });

          searchResults.push(...filteredMembers.map((member) => ({
            type: 'team_member' as const,
            id: String(member.id),
            title: member.name,
            subtitle: `${member.email} • ${member.department || 'N/A'}`,
            metadata: member,
            relevance: calculateRelevance(member.name, searchQuery)
          })));
        }
      }

      // Search leave requests
      if (filters.searchIn === 'all' || filters.searchIn === 'leave_requests') {
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          const leaveRequests: Array<{ teamMember: string; leaveType: string; submittedBy?: string; status: string; startDate: string; endDate: string; id: string; days: number }> = leaveData.requests || [];
          
          const filteredRequests = leaveRequests.filter((request) => {
            const matchesQuery = searchQuery.length === 0 ||
              request.teamMember.toLowerCase().includes(searchQuery.toLowerCase()) ||
              request.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (request.submittedBy && request.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesStatus = filters.status === 'all' || request.status === filters.status;
            const matchesType = filters.leaveType === 'all' || request.leaveType === filters.leaveType;
            
            const matchesDateRange = (!filters.dateFrom || request.startDate >= filters.dateFrom) &&
                                    (!filters.dateTo || request.endDate <= filters.dateTo);
            
            return matchesQuery && matchesStatus && matchesType && matchesDateRange;
          });

          searchResults.push(...filteredRequests.map((request) => ({
            type: 'leave_request' as const,
            id: request.id,
            title: `${request.teamMember} - ${request.leaveType}`,
            subtitle: `${request.startDate} to ${request.endDate} • ${request.days} days • ${request.status}`,
            metadata: request,
            relevance: calculateRelevance(request.teamMember, searchQuery)
          })));
        }
      }

      // Sort by relevance
      searchResults.sort((a, b) => b.relevance - a.relevance);
      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRelevance = (text: string, query: string): number => {
    if (!query) return 1;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText === lowerQuery) return 10;
    if (lowerText.startsWith(lowerQuery)) return 8;
    if (lowerText.includes(lowerQuery)) return 5;
    return 1;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      query: '',
      department: 'all',
      status: 'all',
      leaveType: 'all',
      dateFrom: '',
      dateTo: '',
      searchIn: 'all'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Global Search</h2>
        <p className="text-muted-foreground">
          Search team members, leave requests, and apply advanced filters
        </p>
      </div>

      {/* Main Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, department, leave type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-lg h-12"
                />
              </div>
              <Button
                variant={showAdvanced ? 'default' : 'outline'}
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-12"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              {(searchQuery || filters.department !== 'all' || filters.status !== 'all') && (
                <Button variant="ghost" onClick={clearFilters} className="h-12">
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-4 border">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Search In</Label>
                    <Select value={filters.searchIn} onValueChange={(value) => setFilters({ ...filters, searchIn: value as 'all' | 'team_members' | 'leave_requests' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="team_members">Team Members Only</SelectItem>
                        <SelectItem value="leave_requests">Leave Requests Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Department</Label>
                    <Select value={filters.department} onValueChange={(value) => setFilters({ ...filters, department: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Leave Type</Label>
                    <Select value={filters.leaveType} onValueChange={(value) => setFilters({ ...filters, leaveType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="bereavement">Bereavement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                  </div>
                </div>

                {/* Save Preset */}
                <div className="pt-4 border-t">
                  <Label>Save Filter Preset</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={savePreset} disabled={!presetName.trim()}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Presets */}
      {presets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Filter Presets</CardTitle>
            <CardDescription>Quick access to your favorite filter combinations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <div key={preset.id} className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  <button
                    onClick={() => loadPreset(preset)}
                    className="text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="text-blue-400 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Search Results</span>
            <Badge variant="secondary">{results.length} result{results.length !== 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm">Try adjusting your search query or filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {result.type === 'team_member' ? (
                            <User className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{result.title}</h3>
                          <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                          {result.type === 'leave_request' && result.metadata && (
                            <div className="mt-2 flex gap-2">
                              <Badge className={getStatusColor(String(result.metadata.status))}>
                                {String(result.metadata.status)}
                              </Badge>
                              <Badge variant="outline">
                                {String(result.metadata.leaveType)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {result.type === 'team_member' ? 'Team Member' : 'Leave Request'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalSearch;
