/**
 * Verify CSP Assignments for Random Team Members
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectMongoDB } from './server/mongodb.js';
import { TeamMember, User } from './server/models/index.js';

async function verifyCspAssignments() {
  try {
    await connectMongoDB();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 TEAM MEMBER CSP ASSIGNMENT VERIFICATION');
    console.log('='.repeat(80) + '\n');
    
    // Get all CSPs
    const cspUsers = await User.find({ role: 'csp' }).select('email organizationName');
    const cspSet = new Set(cspUsers.map(c => c.email.toLowerCase()));
    
    console.log(`📊 Total CSPs in system: ${cspUsers.length}\n`);
    
    // Get total team members
    const totalMembers = await TeamMember.countDocuments();
    console.log(`👥 Total team members in system: ${totalMembers}\n`);
    
    // Get 50 random team members
    const randomMembers = await TeamMember.aggregate([
      { $sample: { size: Math.min(50, totalMembers) } }
    ]);
    
    console.log(`✅ Checking ${randomMembers.length} random team members\n`);
    console.log('-'.repeat(100));
    
    let correctAssignments = 0;
    let missingAssignments = 0;
    const results = [];
    
    for (const member of randomMembers) {
      const cspEmail = member.csp; // CSP email is in the 'csp' field
      const cspName = member.cspName;
      const memberName = (member.teamMemberName || 'Unknown').toString();
      const clientName = (member.clientName || 'N/A').toString();
      const status = cspEmail && cspSet.has(cspEmail.toLowerCase()) ? '✅' : '❌';
      
      if (cspEmail && cspSet.has(cspEmail.toLowerCase())) {
        correctAssignments++;
      } else {
        missingAssignments++;
      }
      
      results.push({
        status,
        name: memberName,
        client: clientName,
        cspEmail: cspEmail || 'NOT ASSIGNED',
        cspName: cspName || 'Unknown'
      });
    }
    
    // Display results
    results.forEach(r => {
      console.log(
        `${r.status} ${r.name.padEnd(30)} | Client: ${r.client.padEnd(25)} | CSP: ${r.cspName.padEnd(20)} (${r.cspEmail})`
      );
    });
    
    console.log('\n' + '-'.repeat(100));
    console.log('\n📋 SUMMARY:');
    console.log(`   ✅ Correctly assigned to CSP: ${correctAssignments}/${randomMembers.length}`);
    console.log(`   ❌ Missing CSP assignment: ${missingAssignments}/${randomMembers.length}`);
    console.log(`   📊 Assignment rate: ${((correctAssignments / randomMembers.length) * 100).toFixed(1)}%\n`);
    
    // Check system-wide stats
    const assignedCount = await TeamMember.countDocuments({ csp: { $ne: null, $ne: '' } });
    console.log(`📊 System-wide CSP assignment:`);
    console.log(`   ✅ Assigned: ${assignedCount}/${totalMembers}`);
    console.log(`   ❌ Unassigned: ${totalMembers - assignedCount}/${totalMembers}`);
    console.log(`   📊 System assignment rate: ${((assignedCount / totalMembers) * 100).toFixed(1)}%\n`);
    
    console.log('='.repeat(80) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyCspAssignments();
