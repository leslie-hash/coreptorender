import React, { useState } from 'react';
import { BookOpen, Video, FileText, MessageCircle, Search, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';

export default function HelpDocumentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-700',
      articles: [
        {
          title: 'System Overview',
          description: 'Learn about the Core PTO system and its features',
          content: `
            <h3>Welcome to Core PTO</h3>
            <p>This system helps manage leave requests, absenteeism tracking, and team member data efficiently.</p>
            
            <h4>Key Features:</h4>
            <ul>
              <li><strong>Leave Management:</strong> Submit, review, and approve leave requests</li>
              <li><strong>Absenteeism Tracking:</strong> Monitor and report on team absences</li>
              <li><strong>Client Approval:</strong> Workflow for client approval process</li>
              <li><strong>Payroll Integration:</strong> Send approved requests to payroll</li>
              <li><strong>Google Sheets Sync:</strong> Import historical data from Google Sheets</li>
            </ul>
          `
        },
        {
          title: 'User Roles & Permissions',
          description: 'Understand different user roles and their capabilities',
          content: `
            <h3>User Roles</h3>
            
            <h4>1. Team Members</h4>
            <ul>
              <li>Submit leave requests</li>
              <li>View their own request history</li>
              <li>Track PTO balance</li>
            </ul>
            
            <h4>2. CSPs (Client Service Providers)</h4>
            <ul>
              <li>Review leave requests assigned to them</li>
              <li>Approve/reject requests</li>
              <li>Forward to client approval</li>
              <li>Send approved requests to payroll</li>
              <li>Manage absenteeism reports</li>
            </ul>
            
            <h4>3. Directors/Admins</h4>
            <ul>
              <li>All CSP permissions</li>
              <li>View all requests across the system</li>
              <li>Configure system settings</li>
              <li>Manage user accounts</li>
            </ul>
          `
        }
      ]
    },
    {
      id: 'leave-requests',
      title: 'Leave Requests',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-green-100 text-green-700',
      articles: [
        {
          title: 'How to Submit a Leave Request',
          description: 'Step-by-step guide for team members',
          content: `
            <h3>Submitting a Leave Request</h3>
            
            <h4>Steps:</h4>
            <ol>
              <li>Click <strong>"Submit New Request"</strong> button</li>
              <li>Select your name from the team member dropdown</li>
              <li>Choose leave type (Annual Leave, Sick Leave, Personal, etc.)</li>
              <li>Select start and end dates</li>
              <li>Enter reason for leave</li>
              <li>For sick leave, upload a sick note (required)</li>
              <li>Click <strong>"Submit Request"</strong></li>
            </ol>
            
            <h4>Important Notes:</h4>
            <ul>
              <li>Sick leave requests require a medical certificate/sick note</li>
              <li>Requests are automatically routed to your assigned CSP</li>
              <li>You'll receive notifications about status changes</li>
            </ul>
          `
        },
        {
          title: 'CSP Review Process',
          description: 'How CSPs review and approve requests',
          content: `
            <h3>Review Queue Workflow</h3>
            
            <h4>Review → Client Approval → Payroll</h4>
            
            <h4>Step 1: CSP Review</h4>
            <ul>
              <li>Review team member's leave request details</li>
              <li>Verify PTO balance is sufficient</li>
              <li>Check for policy compliance</li>
              <li>For sick leave, verify sick note is uploaded</li>
              <li>Add review notes if needed</li>
              <li>Click <strong>"Verify & Forward to Client"</strong> or <strong>"Reject"</strong></li>
            </ul>
            
            <h4>Step 2: Client Approval</h4>
            <p>Requests move to "Awaiting Client Approval" section after CSP review.</p>
            <ul>
              <li>CSP forwards to client via email/call/meeting</li>
              <li>Once client approves offline, CSP marks as approved in system</li>
              <li>Add client name and approval method for tracking</li>
            </ul>
            
            <h4>Step 3: Send to Payroll</h4>
            <p>Client-approved requests appear in "Ready for Payroll" section.</p>
            <ul>
              <li>Click <strong>"Send to Payroll"</strong> to finalize</li>
              <li>System notifies payroll team</li>
              <li>Updates absenteeism tracking</li>
            </ul>
          `
        },
        {
          title: 'Sick Note Upload',
          description: 'Requirements for sick leave documentation',
          content: `
            <h3>Sick Note Requirements</h3>
            
            <h4>When is it required?</h4>
            <p>A sick note or medical certificate is <strong>required</strong> for all sick leave requests.</p>
            
            <h4>Accepted File Types:</h4>
            <ul>
              <li>PDF (.pdf)</li>
              <li>Images (.jpg, .jpeg, .png)</li>
              <li>Documents (.doc, .docx)</li>
            </ul>
            
            <h4>How to Upload:</h4>
            <ol>
              <li>When submitting a leave request, select "Sick Leave" as leave type</li>
              <li>An upload section will appear below the reason field</li>
              <li>Click the file upload button and select your sick note</li>
              <li>Submit the request</li>
            </ol>
            
            <h4>For CSPs:</h4>
            <p>Sick leave requests without uploaded sick notes will show a red warning. Contact the team member to upload documentation before approving.</p>
          `
        }
      ]
    },
    {
      id: 'absenteeism',
      title: 'Absenteeism Tracking',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-700',
      articles: [
        {
          title: 'Absenteeism Reports',
          description: 'View and manage absenteeism data',
          content: `
            <h3>Managing Absenteeism Reports</h3>
            
            <h4>View Reports:</h4>
            <p>Click <strong>"Absenteeism Report"</strong> in the sidebar to view all recorded absences.</p>
            
            <h4>Report Columns:</h4>
            <ul>
              <li><strong>Week Start:</strong> Start date of the week</li>
              <li><strong>Start Date - End Date:</strong> Period of absence</li>
              <li><strong>Days / Bus. Days:</strong> Total days and business days</li>
              <li><strong>Name:</strong> Team member who was absent</li>
              <li><strong>Reason:</strong> Reason for absence</li>
              <li><strong>Country:</strong> Team member's location</li>
              <li><strong>Week No, Month, Year:</strong> Time tracking</li>
            </ul>
            
            <h4>Actions:</h4>
            <ul>
              <li><strong>Edit:</strong> Modify absence details</li>
              <li><strong>Delete:</strong> Remove incorrect entries</li>
              <li><strong>Export:</strong> Download reports for analysis</li>
            </ul>
          `
        },
        {
          title: 'Google Sheets Import',
          description: 'Import historical absenteeism data',
          content: `
            <h3>Importing from Google Sheets</h3>
            
            <h4>Setup:</h4>
            <ol>
              <li>Navigate to <strong>Absenteeism Report</strong></li>
              <li>Click <strong>"Google Sheets Import"</strong> tab</li>
              <li>Enter your Google Sheets spreadsheet ID</li>
              <li>Click <strong>"Import from Google Sheets"</strong></li>
            </ol>
            
            <h4>Requirements:</h4>
            <ul>
              <li>Service account authentication configured</li>
              <li>Spreadsheet shared with service account email</li>
              <li>Data in "Input Spreadsheet" sheet</li>
            </ul>
            
            <h4>Expected Columns:</h4>
            <p>Ensure your sheet has these columns:</p>
            <ul>
              <li>Week Start, Start Date, End Date</li>
              <li>No of Days, No of Days - no wk'nd</li>
              <li>Name of Absentee</li>
              <li>Reason for absence</li>
              <li>Country, Week No, Month, Year</li>
            </ul>
          `
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <MessageCircle className="w-5 h-5" />,
      color: 'bg-red-100 text-red-700',
      articles: [
        {
          title: 'Common Issues',
          description: 'Solutions to frequently encountered problems',
          content: `
            <h3>Common Issues & Solutions</h3>
            
            <h4>Issue: Data not loading in Review Queue</h4>
            <ul>
              <li><strong>Solution 1:</strong> Make sure you're logged in with correct credentials</li>
              <li><strong>Solution 2:</strong> Check that backend server is running (port 4000)</li>
              <li><strong>Solution 3:</strong> Hard refresh browser (Ctrl+Shift+R)</li>
              <li><strong>Solution 4:</strong> Clear browser cache and re-login</li>
            </ul>
            
            <h4>Issue: Notifications not showing</h4>
            <ul>
              <li><strong>Solution:</strong> Backend server must be running</li>
              <li><strong>Solution:</strong> Check browser console for API errors</li>
              <li><strong>Solution:</strong> Verify notifications.json file exists in server folder</li>
            </ul>
            
            <h4>Issue: Sick note upload not appearing</h4>
            <ul>
              <li><strong>Solution:</strong> Select "Sick Leave" from leave type dropdown</li>
              <li><strong>Solution:</strong> Refresh the page if dropdown is not responding</li>
              <li><strong>Solution:</strong> Ensure frontend server has been restarted after updates</li>
            </ul>
            
            <h4>Issue: Email domain mismatch (@zimworx.com vs @zimworx.org)</h4>
            <ul>
              <li><strong>Solution:</strong> System now handles both domains automatically</li>
              <li><strong>Note:</strong> CSPs use @zimworx.com for login</li>
              <li><strong>Note:</strong> Assignments may use either domain - both will match</li>
            </ul>
          `
        },
        {
          title: 'Server Status',
          description: 'Check if servers are running',
          content: `
            <h3>Server Status Checks</h3>
            
            <h4>Backend Server (Port 4000):</h4>
            <p>To start: Navigate to server folder and run <code>node index.js</code></p>
            <p>Handles: API requests, database operations, file uploads</p>
            
            <h4>Frontend Server (Port 8082):</h4>
            <p>To start: Navigate to project root and run <code>npm run dev -- --host</code></p>
            <p>Handles: React UI, proxies API calls to backend</p>
            
            <h4>Quick Test:</h4>
            <ul>
              <li>Backend: Open <code>http://localhost:4000/api/notifications</code> in browser</li>
              <li>Frontend: Open <code>http://localhost:8082</code> in browser</li>
            </ul>
          `
        }
      ]
    }
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Help & Documentation</h2>
          <p className="text-muted-foreground">
            Find guides, tutorials, and troubleshooting help
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          v1.0.0
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {selectedCategory === null ? (
        /* Category Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCategories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    {category.icon}
                  </div>
                  <CardTitle>{category.title}</CardTitle>
                </div>
                <CardDescription>
                  {category.articles.length} article{category.articles.length !== 1 ? 's' : ''} available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.articles.slice(0, 3).map((article, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4" />
                      <span>{article.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Article View */
        <div>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to categories
          </button>
          
          {filteredCategories
            .find(c => c.id === selectedCategory)
            ?.articles.map((article, idx) => (
              <Card key={idx} className="mb-6">
                <CardHeader>
                  <CardTitle>{article.title}</CardTitle>
                  <CardDescription>{article.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: article.content }}
                      style={{
                        lineHeight: '1.8',
                      }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Quick Links */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm">Contact support: <strong>support@zimworx.com</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-blue-600" />
            <span className="text-sm">Video tutorials coming soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
