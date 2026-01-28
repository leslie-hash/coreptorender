/**
 * Debug Team Member CSP Assignment - Check Database Schema
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectMongoDB } from './server/mongodb.js';
import { TeamMember } from './server/models/index.js';

async function debugCspAssignments() {
  try {
    await connectMongoDB();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔧 DEBUGGING CSP ASSIGNMENT SCHEMA');
    console.log('='.repeat(80) + '\n');
    
    // Get one sample team member to see all fields
    const sample = await TeamMember.findOne().lean();
    
    if (!sample) {
      console.log('❌ No team members found in database');
      process.exit(1);
    }
    
    console.log('📋 Sample Team Member Document:');
    console.log(JSON.stringify(sample, null, 2));
    console.log('\n' + '-'.repeat(80) + '\n');
    
    // List all fields that might contain CSP info
    console.log('🔍 Possible CSP Assignment Fields:');
    const possibleFields = [
      'cspEmail',
      'assignedCsp',
      'csp',
      'cspId',
      'cspName',
      'organizationEmail',
      'organization',
      'department',
      'client',
      'clientEmail'
    ];
    
    possibleFields.forEach(field => {
      if (field in sample) {
        console.log(`   ✅ ${field}: ${sample[field]}`);
      }
    });
    
    // Get stats on different potential CSP fields
    console.log('\n📊 Field Value Statistics:\n');
    
    const cspEmailCount = await TeamMember.countDocuments({ cspEmail: { $ne: null, $ne: '' } });
    console.log(`   cspEmail (non-empty): ${cspEmailCount} members`);
    
    const assignedCspCount = await TeamMember.countDocuments({ assignedCsp: { $ne: null, $ne: '' } });
    console.log(`   assignedCsp (non-empty): ${assignedCspCount} members`);
    
    const cspCount = await TeamMember.countDocuments({ csp: { $ne: null, $ne: '' } });
    console.log(`   csp (non-empty): ${cspCount} members`);
    
    const cspIdCount = await TeamMember.countDocuments({ cspId: { $ne: null, $ne: '' } });
    console.log(`   cspId (non-empty): ${cspIdCount} members`);
    
    const clientEmailCount = await TeamMember.countDocuments({ clientEmail: { $ne: null, $ne: '' } });
    console.log(`   clientEmail (non-empty): ${clientEmailCount} members`);
    
    // Get unique values
    console.log('\n🔗 Sample CSP Email Values:');
    const uniqueCsps = await TeamMember.aggregate([
      { $group: { _id: '$cspEmail' } },
      { $limit: 10 }
    ]);
    
    uniqueCsps.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc._id || '(empty)'}`);
    });
    
    console.log('\n='.repeat(80) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugCspAssignments();
